"""
CargoBit Kafka → Warehouse Event Ingestion
==========================================

Produktionsreife Kafka-Consumer für ML-Events:
- Batch-Processing (500 Events)
- Idempotenz durch ON CONFLICT UPDATE
- Schema-Mapping für suggestion.generated und suggestion.outcome
- Robustes Fehlerhandling
- PostgreSQL + Snowflake Support

Usage:
    python kafka_ingestion.py --bootstrap-servers kafka:9092
"""

import os
import json
import logging
import argparse
from datetime import datetime
from typing import Dict, List, Optional, Any

from kafka import KafkaConsumer, KafkaError
from kafka.structs import TopicPartition
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURATION
# =============================================================================

BATCH_SIZE = int(os.getenv("BATCH_SIZE", "500"))
TOPICS = ["suggestion.generated", "suggestion.outcome"]

# Database connections
WAREHOUSE_URL = os.getenv(
    "WAREHOUSE_URL",
    "postgresql://user:pass@host:5432/warehouse"
)
SNOWFLAKE_URL = os.getenv("SNOWFLAKE_URL", None)  # Optional

# Kafka configuration
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_GROUP_ID = os.getenv("KAFKA_GROUP_ID", "ml-warehouse-ingestion")
KAFKA_AUTO_OFFSET_RESET = os.getenv("KAFKA_AUTO_OFFSET_RESET", "earliest")

# =============================================================================
# SCHEMA MAPPINGS
# =============================================================================

SCHEMA_SUGGESTION_GENERATED = {
    # Event identifiers
    "suggestion_id": "suggestionId",
    "tour_id": "tourId",
    "order_id": "orderId",
    "segment_id": "segmentId",
    "generated_at": "generatedAt",
    
    # Core entities
    "customer_id": "customerId",
    "driver_id": "driverId",
    "vehicle_id": "vehicleId",
    "carrier_id": "carrierId",
    
    # Computed features (flattened from features object)
    "heuristic_score": ("features", "heuristicScore"),
    "distance_km": ("features", "distanceKm"),
    "price_per_km": ("features", "pricePerKm"),
    "vehicle_match_score": ("features", "vehicleMatchScore"),
    "driver_acceptance_rate_7d": ("features", "driverAcceptanceRate7d"),
    "driver_acceptance_rate_30d": ("features", "driverAcceptanceRate30d"),
    "carrier_reliability_score": ("features", "carrierReliabilityScore"),
    "market_demand_score": ("features", "marketDemandScore"),
    
    # Context (flattened from context object)
    "hour_of_day": ("context", "hourOfDay"),
    "day_of_week": ("context", "dayOfWeek"),
    "is_weekend": ("context", "isWeekend"),
    "is_peak_hour": ("context", "isPeakHour"),
    "region": ("context", "region"),
    "country_code": ("context", "countryCode"),
    
    # Meta
    "suggestion_position": ("meta", "position"),
    "num_competing_suggestions": ("meta", "competingCount"),
    "model_version": ("meta", "modelVersion"),
    "experiment_id": ("meta", "experimentId"),
}

SCHEMA_SUGGESTION_OUTCOME = {
    # Identifiers
    "suggestion_id": "suggestionId",
    
    # Decision
    "decision": "decision",
    "decided_by": "decidedBy",
    "decision_at": "decisionAt",
    "decision_latency_seconds": "decisionLatencySeconds",
    
    # Execution
    "executed": "executed",
    "execution_failure_reason": "executionFailureReason",
    
    # Business metrics
    "planned_margin": "plannedMargin",
    "realized_margin": "realizedMargin",
    "margin_delta": "marginDelta",
    "delay_minutes": "delayMinutes",
    "co2_impact_kg": "co2ImpactKg",
    
    # Model tracking
    "model_used": "modelUsed",
    "model_version": "modelVersion",
    "heuristic_weights_version": "heuristicWeightsVersion",
    "score_ml": "scoreMl",
    "score_heuristic": "scoreHeuristic",
    "score_final": "scoreFinal",
}

# =============================================================================
# DATABASE WRITER
# =============================================================================

class BatchWriter:
    """Batch writer with idempotency and error handling"""
    
    def __init__(self, db_url: str, table_name: str, 
                 pk_column: str = "suggestion_id"):
        self.engine = create_engine(db_url)
        self.table_name = table_name
        self.pk_column = pk_column
        self._metrics = {"written": 0, "errors": 0, "duplicates": 0}
    
    def write_batch(self, rows: List[Dict]) -> Dict[str, int]:
        """Write batch with ON CONFLICT UPDATE for idempotency"""
        if not rows:
            return {"written": 0, "errors": 0}
        
        try:
            with self.engine.begin() as conn:
                # Get columns from first row
                cols = list(rows[0].keys())
                cols_str = ", ".join(cols)
                placeholders = ", ".join([f":{c}" for c in cols])
                
                # Build UPDATE clause (exclude PK)
                update_cols = [c for c in cols if c != self.pk_column]
                update_clause = ", ".join([f"{c}=EXCLUDED.{c}" for c in update_cols])
                
                # Build INSERT with ON CONFLICT
                sql = text(f"""
                    INSERT INTO {self.table_name} ({cols_str})
                    VALUES ({placeholders})
                    ON CONFLICT ({self.pk_column}) DO UPDATE SET
                    {update_clause}
                """)
                
                # Execute batch
                result = conn.execute(sql, rows)
                
                self._metrics["written"] += len(rows)
                logger.info(f"Wrote {len(rows)} rows to {self.table_name}")
                
                return {"written": len(rows), "errors": 0}
                
        except SQLAlchemyError as e:
            logger.error(f"Database write failed for {self.table_name}: {e}")
            self._metrics["errors"] += len(rows)
            
            # Try individual inserts as fallback
            return self._write_individual(rows)
    
    def _write_individual(self, rows: List[Dict]) -> Dict[str, int]:
        """Fallback: Write rows individually"""
        written = 0
        errors = 0
        
        for row in rows:
            try:
                with self.engine.begin() as conn:
                    cols = list(row.keys())
                    cols_str = ", ".join(cols)
                    placeholders = ", ".join([f":{c}" for c in cols])
                    update_cols = [c for c in cols if c != self.pk_column]
                    update_clause = ", ".join([f"{c}=EXCLUDED.{c}" for c in update_cols])
                    
                    sql = text(f"""
                        INSERT INTO {self.table_name} ({cols_str})
                        VALUES ({placeholders})
                        ON CONFLICT ({self.pk_column}) DO UPDATE SET
                        {update_clause}
                    """)
                    conn.execute(sql, row)
                    written += 1
            except Exception as e:
                logger.warning(f"Failed to write row {row.get(self.pk_column)}: {e}")
                errors += 1
        
        return {"written": written, "errors": errors}
    
    def get_metrics(self) -> Dict[str, int]:
        return self._metrics.copy()


# =============================================================================
# EVENT PROCESSOR
# =============================================================================

class EventProcessor:
    """Process and transform Kafka events"""
    
    def __init__(self):
        self.writer_gen = BatchWriter(
            WAREHOUSE_URL, 
            "suggestion_generated",
            "suggestion_id"
        )
        self.writer_out = BatchWriter(
            WAREHOUSE_URL,
            "suggestion_outcome", 
            "suggestion_id"
        )
        
        # Optional Snowflake writer
        self.writer_snowflake = None
        if SNOWFLAKE_URL:
            self.writer_snowflake = BatchWriter(
                SNOWFLAKE_URL,
                "suggestion_outcome",
                "suggestion_id"
            )
    
    def _get_nested_value(self, event: Dict, path) -> Any:
        """Get value from nested dict using path (tuple or string)"""
        if isinstance(path, tuple):
            value = event
            for key in path:
                value = value.get(key, {})
            return value if value != {} else None
        return event.get(path)
    
    def transform_generated(self, event: Dict) -> Dict:
        """Transform suggestion.generated event to warehouse schema"""
        row = {}
        
        for col_name, source_path in SCHEMA_SUGGESTION_GENERATED.items():
            value = self._get_nested_value(event, source_path)
            row[col_name] = value
        
        # Add ingestion metadata
        row["ingested_at"] = datetime.utcnow().isoformat()
        row["source_topic"] = "suggestion.generated"
        
        return row
    
    def transform_outcome(self, event: Dict) -> Dict:
        """Transform suggestion.outcome event to warehouse schema"""
        row = {}
        
        for col_name, source_path in SCHEMA_SUGGESTION_OUTCOME.items():
            value = self._get_nested_value(event, source_path)
            row[col_name] = value
        
        # Add ingestion metadata
        row["ingested_at"] = datetime.utcnow().isoformat()
        row["source_topic"] = "suggestion.outcome"
        
        return row
    
    def process_batch(self, topic: str, events: List[Dict]) -> Dict:
        """Process and write a batch of events"""
        if topic == "suggestion.generated":
            rows = [self.transform_generated(e) for e in events]
            return self.writer_gen.write_batch(rows)
        elif topic == "suggestion.outcome":
            rows = [self.transform_outcome(e) for e in events]
            result = self.writer_out.write_batch(rows)
            
            # Also write to Snowflake if configured
            if self.writer_snowflake:
                self.writer_snowflake.write_batch(rows)
            
            return result
        
        return {"written": 0, "errors": 0}


# =============================================================================
# KAFKA CONSUMER
# =============================================================================

class KafkaWarehouseIngestion:
    """Main Kafka consumer with batch processing"""
    
    def __init__(self, bootstrap_servers: str = KAFKA_BOOTSTRAP):
        self.bootstrap_servers = bootstrap_servers
        self.consumer = None
        self.processor = EventProcessor()
        self.running = False
        
        # Batch buffers per topic
        self.buffers = {topic: [] for topic in TOPICS}
    
    def _create_consumer(self) -> KafkaConsumer:
        """Create Kafka consumer with proper configuration"""
        return KafkaConsumer(
            *TOPICS,
            bootstrap_servers=self.bootstrap_servers.split(","),
            group_id=KAFKA_GROUP_ID,
            auto_offset_reset=KAFKA_AUTO_OFFSET_RESET,
            enable_auto_commit=False,
            value_deserializer=lambda x: json.loads(x.decode("utf-8")),
            # Consumer tuning
            max_poll_records=BATCH_SIZE * 2,
            max_poll_interval_ms=300000,  # 5 min
            session_timeout_ms=30000,
            heartbeat_interval_ms=10000,
        )
    
    def start(self):
        """Start the consumer loop"""
        logger.info(f"Starting Kafka consumer for topics: {TOPICS}")
        logger.info(f"Bootstrap servers: {self.bootstrap_servers}")
        logger.info(f"Batch size: {BATCH_SIZE}")
        
        self.consumer = self._create_consumer()
        self.running = True
        
        try:
            while self.running:
                self._process_messages()
        except KeyboardInterrupt:
            logger.info("Received shutdown signal")
        finally:
            self._shutdown()
    
    def _process_messages(self):
        """Process messages from Kafka"""
        try:
            # Poll for messages
            messages = self.consumer.poll(timeout_ms=1000)
            
            if not messages:
                # Flush buffers on timeout
                self._flush_all_buffers()
                return
            
            for tp, msgs in messages.items():
                topic = tp.topic
                
                for msg in msgs:
                    try:
                        event = msg.value
                        self.buffers[topic].append(event)
                        
                        # Flush if batch size reached
                        if len(self.buffers[topic]) >= BATCH_SIZE:
                            self._flush_buffer(topic)
                    
                    except Exception as e:
                        logger.error(f"Failed to process message: {e}")
                        continue
            
            # Commit offsets after successful processing
            self.consumer.commit()
            
        except KafkaError as e:
            logger.error(f"Kafka error: {e}")
            # Reconnect on error
            self._reconnect()
    
    def _flush_buffer(self, topic: str):
        """Flush buffer for a specific topic"""
        buffer = self.buffers[topic]
        if not buffer:
            return
        
        try:
            result = self.processor.process_batch(topic, buffer)
            logger.info(f"Flushed {topic}: {result}")
            buffer.clear()
        except Exception as e:
            logger.error(f"Failed to flush {topic}: {e}")
    
    def _flush_all_buffers(self):
        """Flush all topic buffers"""
        for topic in TOPICS:
            self._flush_buffer(topic)
    
    def _reconnect(self):
        """Reconnect to Kafka on error"""
        logger.info("Attempting to reconnect to Kafka...")
        try:
            if self.consumer:
                self.consumer.close()
            self.consumer = self._create_consumer()
            logger.info("Reconnected to Kafka")
        except Exception as e:
            logger.error(f"Failed to reconnect: {e}")
    
    def _shutdown(self):
        """Graceful shutdown"""
        logger.info("Shutting down consumer...")
        self.running = False
        
        # Flush remaining messages
        self._flush_all_buffers()
        
        # Close consumer
        if self.consumer:
            self.consumer.close()
        
        # Log final metrics
        logger.info(f"Final metrics: {self.processor.writer_gen.get_metrics()}")
        logger.info(f"Final metrics: {self.processor.writer_out.get_metrics()}")
    
    def stop(self):
        """Stop the consumer"""
        self.running = False


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Kafka to Warehouse Ingestion")
    parser.add_argument(
        "--bootstrap-servers",
        default=KAFKA_BOOTSTRAP,
        help="Kafka bootstrap servers"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=BATCH_SIZE,
        help="Batch size for writes"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run once and exit (for testing)"
    )
    
    args = parser.parse_args()
    
    global BATCH_SIZE
    BATCH_SIZE = args.batch_size
    
    ingestion = KafkaWarehouseIngestion(args.bootstrap_servers)
    
    if args.once:
        # Single run mode for testing
        ingestion._process_messages()
        ingestion._flush_all_buffers()
    else:
        ingestion.start()


if __name__ == "__main__":
    main()
