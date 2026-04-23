"""
CargoBit ETL Pipeline - Suggestion Training Dataset
=====================================================

Production ETL Pipeline für ML-Training-Datasets.
Verarbeitet Kafka-Events und erstellt saubere Trainingsdaten.

Usage:
    spark-submit --deploy-mode cluster suggestion_etl.py --date 2025-04-19

Features:
- Event Joins (suggestion.generated + suggestion.outcome)
- Stammdaten-Anreicherung
- Feature Engineering
- Historische Aggregationen
- Data Quality Checks
- SHAP-Feature-Vorbereitung

Author: CargoBit ML Team
Version: 2.0.0
"""

import argparse
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from pyspark.sql import SparkSession, DataFrame, Window
from pyspark.sql import functions as F
from pyspark.sql.types import *

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# SCHEMAS
# =============================================================================

FEATURES_SCHEMA = StructType([
    StructField("revenueScore", DoubleType(), True),
    StructField("capacityUtilizationScore", DoubleType(), True),
    StructField("priorityScore", DoubleType(), True),
    StructField("riskScore", DoubleType(), True),
    StructField("serviceLevelScore", DoubleType(), True),
    StructField("co2Score", DoubleType(), True),
    StructField("finalHeuristicScore", DoubleType(), True),
])

CONTEXT_SCHEMA = StructType([
    StructField("timeOfDay", StringType(), True),
    StructField("dayOfWeek", StringType(), True),
    StructField("isWeekend", BooleanType(), True),
    StructField("weatherCondition", StringType(), True),
    StructField("trafficCondition", StringType(), True),
])


# =============================================================================
# FEATURE COLUMNS FOR ML
# =============================================================================

FEATURE_COLUMNS = [
    # === Heuristic Features ===
    "revenueScore",
    "capacityScore",
    "priorityScore",
    "riskScore",
    "serviceLevelScore",
    "co2Score",
    "heuristicScoreNorm",
    
    # === Historical Features ===
    "customerAcceptanceRate30d",
    "customerAvgMargin30d",
    "driverAcceptanceRate30d",
    "driverAvgMargin30d",
    "laneAcceptanceRate30d",
    "laneAvgMargin30d",
    
    # === Context Features ===
    "hourOfDay",
    "dayOfWeekNumeric",
    "isWeekend",
    "timeOfDayEncoded",
    "weatherEncoded",
    "trafficEncoded",
    
    # === Profile Features ===
    "customerTierEncoded",
    "customerCreditRating",
    "driverRating",
    "driverExperienceYears",
    
    # === Distance/Time Features ===
    "distancePickupToRouteNorm",
    "distanceDeliveryToDestinationNorm",
    "timeToPickupNorm",
    "timeToDeliveryNorm",
]


# =============================================================================
# ETL PIPELINE CLASS
# =============================================================================

class SuggestionETLPipeline:
    """
    Production ETL Pipeline für Suggestion Training Dataset.
    
    Pipeline-Schritte:
    1. Events laden (suggestion.generated + suggestion.outcome)
    2. Join auf suggestionId
    3. Stammdaten anreichern
    4. Feature Engineering
    5. Historische Features berechnen
    6. Data Quality Validation
    7. Training Dataset schreiben
    """
    
    def __init__(self, spark: SparkSession, config: dict):
        self.spark = spark
        self.config = config
        self.s3_bucket = config.get("s3_bucket", "cargobit-datalake")
        self.database = config.get("database", "cargobit_analytics")
        self.quality_thresholds = config.get("quality_thresholds", {
            "min_samples": 100,
            "max_null_rate": 0.3,
            "min_acceptance_rate": 0.05,
        })
        
    def run(self, date: str, lookback_days: int = 90) -> dict:
        """
        Führt ETL für ein bestimmtes Datum aus.
        
        Args:
            date: Ziel-Datum (YYYY-MM-DD)
            lookback_days: Historie in Tagen für Aggregationen
            
        Returns:
            Dict mit Statistiken und Quality-Metriken
        """
        logger.info(f"Starting ETL for date: {date}")
        
        start_time = datetime.now()
        stats = {
            "date": date,
            "lookback_days": lookback_days,
            "pipeline_start": start_time.isoformat(),
        }
        
        try:
            # Step 1: Load Events
            logger.info("Step 1/7: Loading events...")
            generated_df = self._load_suggestion_events(date, lookback_days)
            outcome_df = self._load_outcome_events(date, lookback_days)
            
            stats["generated_count"] = generated_df.count()
            stats["outcome_count"] = outcome_df.count()
            logger.info(f"  Generated events: {stats['generated_count']}")
            logger.info(f"  Outcome events: {stats['outcome_count']}")
            
            # Step 2: Join Events
            logger.info("Step 2/7: Joining events...")
            joined_df = self._join_events(generated_df, outcome_df)
            stats["joined_count"] = joined_df.count()
            logger.info(f"  Joined records: {stats['joined_count']}")
            
            # Step 3: Enrich with Master Data
            logger.info("Step 3/7: Enriching with master data...")
            enriched_df = self._enrich_with_master_data(joined_df, date)
            
            # Step 4: Feature Engineering
            logger.info("Step 4/7: Engineering features...")
            features_df = self._engineer_features(enriched_df)
            
            # Step 5: Compute Historical Features
            logger.info("Step 5/7: Computing historical features...")
            features_df = self._compute_historical_features(features_df, date)
            
            # Step 6: Data Quality Validation
            logger.info("Step 6/7: Running data quality checks...")
            quality_report = self._validate_data_quality(features_df)
            stats["quality_report"] = quality_report
            
            if not quality_report["passed"]:
                logger.warning(f"Data quality check failed: {quality_report['issues']}")
            
            # Step 7: Write Training Dataset
            logger.info("Step 7/7: Writing training dataset...")
            self._write_training_dataset(features_df, date)
            
            stats["final_count"] = features_df.count()
            
        except Exception as e:
            logger.error(f"ETL failed: {e}")
            stats["error"] = str(e)
            raise
        
        stats["duration_seconds"] = (datetime.now() - start_time).total_seconds()
        stats["pipeline_end"] = datetime.now().isoformat()
        stats["status"] = "success"
        
        logger.info(f"ETL completed: {json.dumps(stats, indent=2)}")
        return stats
    
    def _load_suggestion_events(self, date: str, lookback_days: int) -> DataFrame:
        """Lädt suggestion.generated Events aus S3."""
        
        path = f"s3a://{self.s3_bucket}/events/suggestion.generated/"
        
        df = self.spark.read.parquet(path)
        
        # Filter by date range
        end_date = datetime.strptime(date, "%Y-%m-%d")
        start_date = end_date - timedelta(days=lookback_days)
        
        df = df.filter(
            (F.col("occurredAt") >= F.lit(start_date)) &
            (F.col("occurredAt") <= F.lit(end_date))
        )
        
        # Cache for multiple uses
        df.cache()
        
        return df
    
    def _load_outcome_events(self, date: str, lookback_days: int) -> DataFrame:
        """Lädt suggestion.outcome Events aus S3."""
        
        path = f"s3a://{self.s3_bucket}/events/suggestion.outcome/"
        
        df = self.spark.read.parquet(path)
        
        # Filter by date range
        end_date = datetime.strptime(date, "%Y-%m-%d")
        start_date = end_date - timedelta(days=lookback_days)
        
        df = df.filter(
            (F.col("occurredAt") >= F.lit(start_date)) &
            (F.col("occurredAt") <= F.lit(end_date))
        )
        
        # Cache for multiple uses
        df.cache()
        
        return df
    
    def _join_events(
        self, 
        generated_df: DataFrame, 
        outcome_df: DataFrame
    ) -> DataFrame:
        """Joint suggestion.generated mit suggestion.outcome."""
        
        # Flatten generated events
        generated_flat = generated_df.select(
            F.col("suggestionId"),
            F.col("tourId"),
            F.col("orderId"),
            F.col("customerId"),
            F.col("driverId"),
            F.col("vehicleId"),
            F.col("lane"),
            # Flatten features
            F.col("features.revenueScore").alias("revenueScore"),
            F.col("features.capacityUtilizationScore").alias("capacityScore"),
            F.col("features.priorityScore").alias("priorityScore"),
            F.col("features.riskScore").alias("riskScore"),
            F.col("features.serviceLevelScore").alias("serviceLevelScore"),
            F.col("features.co2Score").alias("co2Score"),
            F.col("features.finalHeuristicScore").alias("heuristicScore"),
            # Flatten context
            F.col("context.timeOfDay").alias("timeOfDay"),
            F.col("context.dayOfWeek").alias("dayOfWeek"),
            F.col("context.isWeekend").alias("isWeekend"),
            F.col("context.weatherCondition").alias("weather"),
            F.col("context.trafficCondition").alias("traffic"),
            # Distance/Time features
            F.col("context.distancePickupToRoute").alias("distancePickupToRoute"),
            F.col("context.distanceDeliveryToDestination").alias("distanceDeliveryToDestination"),
            F.col("context.timeToPickup").alias("timeToPickup"),
            F.col("context.timeToDelivery").alias("timeToDelivery"),
            # ML metadata
            F.col("mlMetadata.modelVersion").alias("modelVersion"),
            F.col("mlMetadata.modelUsed").alias("modelUsed"),
            F.col("mlMetadata.blendFactor").alias("blendFactor"),
            # Timestamps
            F.col("occurredAt").alias("generatedAt"),
        )
        
        # Flatten outcome events
        outcome_flat = outcome_df.select(
            F.col("suggestionId"),
            F.col("decision"),
            F.col("decidedBy"),
            F.col("decisionLatencySeconds"),
            F.col("executed"),
            F.col("executionFailureReason"),
            F.col("plannedMargin"),
            F.col("realizedMargin"),
            F.col("marginDelta"),
            F.col("revenue"),
            F.col("costs"),
            F.col("delayMinutes"),
            F.col("co2ImpactKg"),
            F.col("detourKm"),
            F.col("occurredAt").alias("outcomeAt"),
        )
        
        # Left join (all suggestions, outcomes if available)
        joined = generated_flat.join(
            outcome_flat,
            on="suggestionId",
            how="left"
        )
        
        return joined
    
    def _enrich_with_master_data(self, df: DataFrame, date: str) -> DataFrame:
        """Reichert Daten mit Stammdaten an."""
        
        # === Customer Master Data ===
        customers_df = self.spark.read.parquet(
            f"s3a://{self.s3_bucket}/master_data/customers/"
        ).select(
            F.col("customerId"),
            F.col("tier").alias("customerTier"),
            F.col("slaLevel").alias("customerSlaLevel"),
            F.col("region").alias("customerRegion"),
            F.col("creditRating").alias("customerCreditRating"),
        )
        
        df = df.join(customers_df, on="customerId", how="left")
        
        # === Driver Master Data ===
        drivers_df = self.spark.read.parquet(
            f"s3a://{self.s3_bucket}/master_data/drivers/"
        ).select(
            F.col("driverId"),
            F.col("rating").alias("driverRating"),
            F.col("experienceYears").alias("driverExperienceYears"),
            F.col("preferredVehicleType").alias("driverPreferredVehicleType"),
        )
        
        df = df.join(drivers_df, on="driverId", how="left")
        
        # === Vehicle Master Data ===
        vehicles_df = self.spark.read.parquet(
            f"s3a://{self.s3_bucket}/master_data/vehicles/"
        ).select(
            F.col("vehicleId"),
            F.col("vehicleType"),
            F.col("volumeMaxM3").alias("vehicleVolumeMax"),
            F.col("weightMaxKg").alias("vehicleWeightMax"),
            F.col("palletsMax").alias("vehiclePalletsMax"),
        )
        
        df = df.join(vehicles_df, on="vehicleId", how="left")
        
        # === Lane Statistics ===
        lanes_df = self.spark.read.parquet(
            f"s3a://{self.s3_bucket}/master_data/lanes/"
        ).select(
            F.col("laneId").alias("lane"),
            F.col("avgDistanceKm").alias("laneAvgDistanceKm"),
            F.col("avgDurationMinutes").alias("laneAvgDurationMinutes"),
        )
        
        df = df.join(lanes_df, on="lane", how="left")
        
        return df
    
    def _engineer_features(self, df: DataFrame) -> DataFrame:
        """Feature Engineering für ML-Training."""
        
        # === Labels ===
        
        # Binary: accepted
        df = df.withColumn(
            "accepted",
            F.when(F.col("decision") == "ACCEPT", F.lit(1)).otherwise(F.lit(0))
        )
        
        # Binary: executed
        df = df.withColumn(
            "executedBinary",
            F.when(F.col("executed") == True, F.lit(1)).otherwise(F.lit(0))
        )
        
        # Continuous: utility score (for ranking quality)
        df = df.withColumn(
            "utilityScore",
            F.coalesce(F.col("realizedMargin"), F.lit(0.0)) - 
            F.coalesce(F.col("delayMinutes"), F.lit(0)) * F.lit(2.0) -
            F.coalesce(F.col("detourKm"), F.lit(0)) * F.lit(0.1)
        )
        
        # Multi-class label for Learning-to-Rank
        df = df.withColumn(
            "label",
            F.when(
                (F.col("decision") == "ACCEPT") & 
                (F.col("executed") == True) & 
                (F.col("realizedMargin") > F.col("plannedMargin")),
                F.lit(2)  # High value: accepted, executed, exceeded margin
            ).when(
                (F.col("decision") == "ACCEPT") & 
                (F.col("executed") == True),
                F.lit(1)  # Medium value: accepted and executed
            ).when(
                F.col("decision") == "ACCEPT",
                F.lit(0)  # Low value: accepted but not executed
            ).otherwise(F.lit(0))  # Rejected
        )
        
        # === Temporal Features ===
        
        df = df.withColumn("hourOfDay", F.hour(F.col("generatedAt")))
        df = df.withColumn("dayOfWeekNumeric", F.dayofweek(F.col("generatedAt")))
        df = df.withColumn("dayOfMonth", F.dayofmonth(F.col("generatedAt")))
        df = df.withColumn("month", F.month(F.col("generatedAt")))
        
        # === Normalized Features ===
        
        # Normalize heuristic score (typically 0-15, normalize to 0-1)
        df = df.withColumn(
            "heuristicScoreNorm",
            F.least(F.greatest(F.col("heuristicScore") / F.lit(15.0), F.lit(0.0)), F.lit(1.0))
        )
        
        # Normalize distance features (0-500 km range)
        df = df.withColumn(
            "distancePickupToRouteNorm",
            F.least(F.greatest(
                F.coalesce(F.col("distancePickupToRoute"), F.lit(0.0)) / F.lit(500.0),
                F.lit(0.0)
            ), F.lit(1.0))
        )
        
        df = df.withColumn(
            "distanceDeliveryToDestinationNorm",
            F.least(F.greatest(
                F.coalesce(F.col("distanceDeliveryToDestination"), F.lit(0.0)) / F.lit(500.0),
                F.lit(0.0)
            ), F.lit(1.0))
        )
        
        # Normalize time features (0-360 minutes range)
        df = df.withColumn(
            "timeToPickupNorm",
            F.least(F.greatest(
                F.coalesce(F.col("timeToPickup"), F.lit(0.0)) / F.lit(360.0),
                F.lit(0.0)
            ), F.lit(1.0))
        )
        
        df = df.withColumn(
            "timeToDeliveryNorm",
            F.least(F.greatest(
                F.coalesce(F.col("timeToDelivery"), F.lit(0.0)) / F.lit(360.0),
                F.lit(0.0)
            ), F.lit(1.0))
        )
        
        # === Categorical Encodings ===
        
        # Time of day encoding
        df = df.withColumn(
            "timeOfDayEncoded",
            F.when(F.col("timeOfDay") == "MORNING", F.lit(0))
             .when(F.col("timeOfDay") == "MIDDAY", F.lit(1))
             .when(F.col("timeOfDay") == "AFTERNOON", F.lit(2))
             .when(F.col("timeOfDay") == "EVENING", F.lit(3))
             .when(F.col("timeOfDay") == "NIGHT", F.lit(4))
             .otherwise(F.lit(5))
        )
        
        # Weather encoding
        df = df.withColumn(
            "weatherEncoded",
            F.when(F.col("weather") == "CLEAR", F.lit(0))
             .when(F.col("weather") == "CLOUDY", F.lit(1))
             .when(F.col("weather") == "RAINY", F.lit(2))
             .when(F.col("weather") == "SNOWY", F.lit(3))
             .when(F.col("weather") == "STORMY", F.lit(4))
             .otherwise(F.lit(5))
        )
        
        # Traffic encoding
        df = df.withColumn(
            "trafficEncoded",
            F.when(F.col("traffic") == "LIGHT", F.lit(0))
             .when(F.col("traffic") == "NORMAL", F.lit(1))
             .when(F.col("traffic") == "HEAVY", F.lit(2))
             .when(F.col("traffic") == "CONGESTED", F.lit(3))
             .otherwise(F.lit(4))
        )
        
        # Customer tier encoding
        df = df.withColumn(
            "customerTierEncoded",
            F.when(F.col("customerTier") == "PLATINUM", F.lit(4))
             .when(F.col("customerTier") == "GOLD", F.lit(3))
             .when(F.col("customerTier") == "SILVER", F.lit(2))
             .when(F.col("customerTier") == "BRONZE", F.lit(1))
             .otherwise(F.lit(0))
        )
        
        # Decision latency buckets
        df = df.withColumn(
            "decisionLatencyBucket",
            F.when(F.col("decisionLatencySeconds") < 60, F.lit(0))
             .when(F.col("decisionLatencySeconds") < 300, F.lit(1))
             .when(F.col("decisionLatencySeconds") < 600, F.lit(2))
             .otherwise(F.lit(3))
        )
        
        # Date partition
        df = df.withColumn("date", F.to_date(F.col("generatedAt")))
        
        return df
    
    def _compute_historical_features(self, df: DataFrame, date: str) -> DataFrame:
        """Berechnet historische Aggregations-Features für ML."""
        
        # === Customer Historical Features (30-day rolling) ===
        
        customer_stats = df.filter(F.col("decision").isNotNull()).groupBy("customerId").agg(
            F.sum("accepted").alias("customerTotalAccepts"),
            F.count("*").alias("customerTotalSuggestions"),
            (F.sum("accepted") / F.count("*")).alias("customerAcceptanceRate30d"),
            F.avg("realizedMargin").alias("customerAvgMargin30d"),
            F.avg("delayMinutes").alias("customerAvgDelay30d"),
            F.stddev("realizedMargin").alias("customerMarginStddev"),
        )
        
        df = df.join(customer_stats, on="customerId", how="left")
        
        # === Driver Historical Features ===
        
        driver_stats = df.filter(
            (F.col("decision").isNotNull()) & (F.col("driverId").isNotNull())
        ).groupBy("driverId").agg(
            F.sum("accepted").alias("driverTotalAccepts"),
            F.count("*").alias("driverTotalSuggestions"),
            (F.sum("accepted") / F.count("*")).alias("driverAcceptanceRate30d"),
            F.avg("realizedMargin").alias("driverAvgMargin30d"),
            F.avg("delayMinutes").alias("driverAvgDelay30d"),
        )
        
        df = df.join(driver_stats, on="driverId", how="left")
        
        # === Lane Historical Features ===
        
        lane_stats = df.filter(F.col("lane").isNotNull()).groupBy("lane").agg(
            F.sum("accepted").alias("laneTotalAccepts"),
            F.count("*").alias("laneTotalSuggestions"),
            (F.sum("accepted") / F.count("*")).alias("laneAcceptanceRate30d"),
            F.avg("realizedMargin").alias("laneAvgMargin30d"),
            F.avg("detourKm").alias("laneAvgDetourKm"),
            F.avg("delayMinutes").alias("laneAvgDelay30d"),
        )
        
        df = df.join(lane_stats, on="lane", how="left")
        
        # === Fill null values with defaults ===
        
        df = df.fillna({
            "customerAcceptanceRate30d": 0.5,
            "customerAvgMargin30d": 0.0,
            "customerAvgDelay30d": 0.0,
            "customerMarginStddev": 0.0,
            "driverAcceptanceRate30d": 0.5,
            "driverAvgMargin30d": 0.0,
            "driverAvgDelay30d": 0.0,
            "laneAcceptanceRate30d": 0.5,
            "laneAvgMargin30d": 0.0,
            "laneAvgDetourKm": 0.0,
            "laneAvgDelay30d": 0.0,
            "customerCreditRating": 0.5,
            "driverRating": 3.0,
            "driverExperienceYears": 0.0,
        })
        
        return df
    
    def _validate_data_quality(self, df: DataFrame) -> dict:
        """Validiert Datenqualität."""
        
        issues = []
        warnings = []
        passed = True
        
        total_count = df.count()
        
        # Check minimum samples
        if total_count < self.quality_thresholds["min_samples"]:
            issues.append(f"Insufficient samples: {total_count} < {self.quality_thresholds['min_samples']}")
            passed = False
        
        # Check null rates for critical columns
        critical_columns = ["suggestionId", "tourId", "customerId", "heuristicScore"]
        for col in critical_columns:
            null_count = df.filter(F.col(col).isNull()).count()
            null_rate = null_count / total_count if total_count > 0 else 1.0
            
            if null_rate > self.quality_thresholds["max_null_rate"]:
                issues.append(f"High null rate for {col}: {null_rate:.2%}")
                passed = False
        
        # Check acceptance rate
        acceptance_rate = df.filter(F.col("decision") == "ACCEPT").count() / total_count if total_count > 0 else 0
        
        if acceptance_rate < self.quality_thresholds["min_acceptance_rate"]:
            warnings.append(f"Low acceptance rate: {acceptance_rate:.2%}")
        
        # Check feature distributions
        feature_stats = {}
        for col in FEATURE_COLUMNS[:6]:  # Check first 6 features
            if col in df.columns:
                stats = df.select(
                    F.mean(col).alias("mean"),
                    F.stddev(col).alias("std"),
                    F.min(col).alias("min"),
                    F.max(col).alias("max")
                ).first()
                
                feature_stats[col] = {
                    "mean": float(stats["mean"]) if stats["mean"] else 0,
                    "std": float(stats["std"]) if stats["std"] else 0,
                    "min": float(stats["min"]) if stats["min"] else 0,
                    "max": float(stats["max"]) if stats["max"] else 0,
                }
        
        return {
            "passed": passed,
            "issues": issues,
            "warnings": warnings,
            "total_records": total_count,
            "acceptance_rate": acceptance_rate,
            "feature_stats": feature_stats,
        }
    
    def _write_training_dataset(self, df: DataFrame, date: str) -> None:
        """Schreibt Training Dataset nach S3."""
        
        output_path = f"s3a://{self.s3_bucket}/training_datasets/suggestions/"
        
        # Select final columns
        final_columns = [
            # IDs
            "suggestionId",
            "tourId",
            "orderId",
            "customerId",
            "driverId",
            "vehicleId",
            "lane",
            # Labels
            "accepted",
            "label",
            "utilityScore",
            "decision",
            "executedBinary",
            # Features
        ] + FEATURE_COLUMNS + [
            # Metadata
            "heuristicScore",
            "modelVersion",
            "modelUsed",
            "blendFactor",
            "realizedMargin",
            "delayMinutes",
            "detourKm",
            "generatedAt",
            "date",
        ]
        
        # Filter to existing columns
        existing_columns = [c for c in final_columns if c in df.columns]
        output_df = df.select(*existing_columns)
        
        # Write as partitioned Parquet
        output_df.write.mode("overwrite").partitionBy("date").parquet(output_path)
        
        # Also write to Delta Lake if configured
        if self.config.get("use_delta_lake", False):
            delta_path = f"s3a://{self.s3_bucket}/delta/suggestions/"
            output_df.write.mode("overwrite").format("delta").partitionBy("date").save(delta_path)
        
        logger.info(f"Wrote training dataset to {output_path}")


# =============================================================================
# SPARK SESSION FACTORY
# =============================================================================

def create_spark_session(app_name: str = "SuggestionETL") -> SparkSession:
    """Erstellt Spark Session mit optimaler Konfiguration."""
    
    spark = SparkSession.builder \
        .appName(app_name) \
        .config("spark.sql.adaptive.enabled", "true") \
        .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
        .config("spark.sql.adaptive.advisoryPartitionSizeInBytes", "128MB") \
        .config("spark.sql.parquet.compression.codec", "snappy") \
        .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
        .config("spark.hadoop.fs.s3a.fast.upload", "true") \
        .config("spark.hadoop.fs.s3a.path.style.access", "true") \
        .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer") \
        .config("spark.sql.execution.arrow.pyspark.enabled", "true") \
        .config("spark.sql.shuffle.partitions", "200") \
        .config("spark.driver.memory", "4g") \
        .config("spark.executor.memory", "8g") \
        .config("spark.executor.memoryOverhead", "2g") \
        .getOrCreate()
    
    return spark


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="CargoBit Suggestion ETL Pipeline")
    parser.add_argument("--date", required=True, help="Target date (YYYY-MM-DD)")
    parser.add_argument("--lookback-days", type=int, default=90, help="Lookback days for history")
    parser.add_argument("--s3-bucket", default="cargobit-datalake", help="S3 bucket name")
    parser.add_argument("--use-delta-lake", action="store_true", help="Use Delta Lake format")
    parser.add_argument("--dry-run", action="store_true", help="Dry run without writing")
    
    args = parser.parse_args()
    
    # Create Spark session
    spark = create_spark_session()
    
    # Run ETL
    config = {
        "s3_bucket": args.s3_bucket,
        "use_delta_lake": args.use_delta_lake,
    }
    
    etl = SuggestionETLPipeline(spark, config)
    
    if not args.dry_run:
        stats = etl.run(args.date, args.lookback_days)
    else:
        logger.info("Dry run - skipping write step")
        stats = {"status": "dry_run"}
    
    # Print stats
    print("\n" + "=" * 60)
    print("ETL Pipeline Statistics")
    print("=" * 60)
    for key, value in stats.items():
        if isinstance(value, dict):
            print(f"\n{key}:")
            for k, v in value.items():
                print(f"  {k}: {v}")
        else:
            print(f"{key}: {value}")
    
    spark.stop()


if __name__ == "__main__":
    main()
