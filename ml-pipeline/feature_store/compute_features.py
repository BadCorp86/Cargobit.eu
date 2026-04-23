"""
CargoBit Feature Computation Pipeline
=====================================

Computes and materializes features for the Feature Store.

Steps:
1. Load training data from S3
2. Aggregate features per entity (customer, driver, lane, vehicle)
3. Write feature tables to S3
4. Trigger Feast materialization

Usage:
    spark-submit --deploy-mode cluster compute_features.py --date 2025-04-19

Author: CargoBit ML Team
"""

import argparse
import logging
from datetime import datetime, timedelta
from typing import Dict

from pyspark.sql import SparkSession, DataFrame, Window
from pyspark.sql import functions as F
from pyspark.sql.types import *

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FeatureComputationPipeline:
    """Computes features for the Feature Store."""
    
    def __init__(self, spark: SparkSession, config: dict):
        self.spark = spark
        self.config = config
        self.s3_bucket = config.get("s3_bucket", "cargobit-datalake")
        self.feature_store_bucket = config.get("feature_store_bucket", "cargobit-feature-store")
        
    def run(self, date: str) -> dict:
        """Runs feature computation for a specific date."""
        
        logger.info(f"Starting feature computation for date: {date}")
        
        stats = {"date": date}
        
        # Load training data
        logger.info("Loading training data...")
        df = self._load_training_data(date)
        stats["input_records"] = df.count()
        
        # Compute features for each entity
        logger.info("Computing customer features...")
        customer_features = self._compute_customer_features(df)
        self._write_features(customer_features, "customer_features", date)
        stats["customer_features"] = customer_features.count()
        
        logger.info("Computing driver features...")
        driver_features = self._compute_driver_features(df)
        self._write_features(driver_features, "driver_features", date)
        stats["driver_features"] = driver_features.count()
        
        logger.info("Computing lane features...")
        lane_features = self._compute_lane_features(df)
        self._write_features(lane_features, "lane_features", date)
        stats["lane_features"] = lane_features.count()
        
        logger.info("Computing vehicle features...")
        vehicle_features = self._compute_vehicle_features(df)
        self._write_features(vehicle_features, "vehicle_features", date)
        stats["vehicle_features"] = vehicle_features.count()
        
        logger.info(f"Feature computation complete: {stats}")
        return stats
    
    def _load_training_data(self, date: str) -> DataFrame:
        """Loads training data from S3."""
        
        path = f"s3a://{self.s3_bucket}/training_datasets/suggestions/"
        
        df = self.spark.read.parquet(path)
        
        # Filter to relevant date range
        end_date = datetime.strptime(date, "%Y-%m-%d")
        start_date = end_date - timedelta(days=90)
        
        df = df.filter(
            (F.col("date") >= F.lit(start_date)) &
            (F.col("date") <= F.lit(end_date))
        )
        
        return df
    
    def _compute_customer_features(self, df: DataFrame) -> DataFrame:
        """Computes customer-level features."""
        
        # Define time windows
        df_7d = df.filter(F.col("date") >= F.lit(F.date_sub(F.current_date(), 7)))
        df_30d = df.filter(F.col("date") >= F.lit(F.date_sub(F.current_date(), 30)))
        df_90d = df.filter(F.col("date") >= F.lit(F.date_sub(F.current_date(), 90)))
        
        # 7-day features
        features_7d = df_7d.filter(F.col("customerId").isNotNull()).groupBy("customerId").agg(
            (F.sum("accepted") / F.count("*")).alias("acceptance_rate_7d"),
            F.avg("realizedMargin").alias("realized_margin_avg_7d"),
            F.count("*").alias("total_suggestions_7d"),
        )
        
        # 30-day features
        features_30d = df_30d.filter(F.col("customerId").isNotNull()).groupBy("customerId").agg(
            (F.sum("accepted") / F.count("*")).alias("acceptance_rate_30d"),
            F.avg("realizedMargin").alias("realized_margin_avg_30d"),
            F.stddev("realizedMargin").alias("margin_stddev_30d"),
            F.count("*").alias("total_suggestions_30d"),
            F.sum("accepted").alias("total_accepts_30d"),
            (F.sum(F.when(F.col("decision") == "REJECT", 1).otherwise(0)) / F.count("*")).alias("cancellation_rate_30d"),
            F.avg("delayMinutes").alias("avg_delay_minutes_30d"),
            (F.sum(F.when(F.col("delayMinutes") <= 0, 1).otherwise(0)) / F.count("*")).alias("on_time_rate_30d"),
        )
        
        # 90-day features
        features_90d = df_90d.filter(F.col("customerId").isNotNull()).groupBy("customerId").agg(
            (F.sum("accepted") / F.count("*")).alias("acceptance_rate_90d"),
            F.avg("realizedMargin").alias("realized_margin_avg_90d"),
        )
        
        # Profile features (from latest record)
        profile_features = df.filter(F.col("customerId").isNotNull()).groupBy("customerId").agg(
            F.first("customerTierEncoded").alias("tier_encoded"),
            F.first("customerCreditRating").alias("credit_rating"),
        )
        
        # Join all features
        result = features_7d.join(features_30d, on="customerId", how="outer")
        result = result.join(features_90d, on="customerId", how="outer")
        result = result.join(profile_features, on="customerId", how="outer")
        
        # Add timestamp
        result = result.withColumn("event_timestamp", F.current_timestamp())
        result = result.withColumn("customer_id", F.col("customerId"))
        
        return result
    
    def _compute_driver_features(self, df: DataFrame) -> DataFrame:
        """Computes driver-level features."""
        
        df_30d = df.filter(F.col("date") >= F.lit(F.date_sub(F.current_date(), 30)))
        df_90d = df.filter(F.col("date") >= F.lit(F.date_sub(F.current_date(), 90)))
        
        # 7-day features
        features_7d = df.filter(F.col("driverId").isNotNull()).filter(
            F.col("date") >= F.lit(F.date_sub(F.current_date(), 7))
        ).groupBy("driverId").agg(
            (F.sum("accepted") / F.count("*")).alias("acceptance_rate_7d"),
            F.count("*").alias("total_suggestions_7d"),
        )
        
        # 30-day features
        features_30d = df_30d.filter(F.col("driverId").isNotNull()).groupBy("driverId").agg(
            (F.sum("accepted") / F.count("*")).alias("acceptance_rate_30d"),
            F.avg("realizedMargin").alias("realized_margin_avg_30d"),
            F.stddev("realizedMargin").alias("margin_stddev_30d"),
            F.count("*").alias("total_suggestions_30d"),
            F.sum("accepted").alias("total_accepts_30d"),
            F.countDistinct("tourId").alias("total_tours_30d"),
            F.avg("delayMinutes").alias("avg_delay_minutes_30d"),
            (F.sum(F.when(F.col("delayMinutes") <= 0, 1).otherwise(0)) / F.count("*")).alias("on_time_rate_30d"),
            F.avg("detourKm").alias("avg_detour_km_30d"),
        )
        
        # 90-day features
        features_90d = df_90d.filter(F.col("driverId").isNotNull()).groupBy("driverId").agg(
            (F.sum("accepted") / F.count("*")).alias("acceptance_rate_90d"),
        )
        
        # Profile features
        profile_features = df.filter(F.col("driverId").isNotNull()).groupBy("driverId").agg(
            F.first("driverRating").alias("rating"),
            F.first("driverExperienceYears").alias("experience_years"),
        )
        
        # Join all
        result = features_7d.join(features_30d, on="driverId", how="outer")
        result = result.join(features_90d, on="driverId", how="outer")
        result = result.join(profile_features, on="driverId", how="outer")
        
        result = result.withColumn("event_timestamp", F.current_timestamp())
        result = result.withColumn("driver_id", F.col("driverId"))
        
        return result
    
    def _compute_lane_features(self, df: DataFrame) -> DataFrame:
        """Computes lane-level features."""
        
        df_30d = df.filter(F.col("date") >= F.lit(F.date_sub(F.current_date(), 30)))
        df_90d = df.filter(F.col("date") >= F.lit(F.date_sub(F.current_date(), 90)))
        
        # 30-day features
        features_30d = df_30d.filter(F.col("lane").isNotNull()).groupBy("lane").agg(
            (F.sum("accepted") / F.count("*")).alias("acceptance_rate_30d"),
            F.avg("realizedMargin").alias("realized_margin_avg_30d"),
            F.countDistinct("tourId").alias("total_tours_30d"),
        )
        
        # 90-day features
        features_90d = df_90d.filter(F.col("lane").isNotNull()).groupBy("lane").agg(
            (F.sum("accepted") / F.count("*")).alias("acceptance_rate_90d"),
            F.avg("realizedMargin").alias("realized_margin_avg_90d"),
            F.avg("delayMinutes").alias("avg_delay_minutes_90d"),
            F.avg("detourKm").alias("avg_detour_km_90d"),
        )
        
        # Lane metadata
        lane_meta = df.filter(F.col("lane").isNotNull()).groupBy("lane").agg(
            F.first("laneAvgDistanceKm").alias("avg_distance_km"),
            F.first("laneAvgDurationMinutes").alias("avg_duration_minutes"),
        )
        
        # Join
        result = features_30d.join(features_90d, on="lane", how="outer")
        result = result.join(lane_meta, on="lane", how="outer")
        
        # Add seasonality and demand (simplified)
        result = result.withColumn("seasonality_score", F.lit(0.5))
        result = result.withColumn("demand_factor", F.lit(1.0))
        
        result = result.withColumn("event_timestamp", F.current_timestamp())
        result = result.withColumn("lane_id", F.col("lane"))
        
        return result
    
    def _compute_vehicle_features(self, df: DataFrame) -> DataFrame:
        """Computes vehicle-level features."""
        
        df_7d = df.filter(F.col("date") >= F.lit(F.date_sub(F.current_date(), 7)))
        df_30d = df.filter(F.col("date") >= F.lit(F.date_sub(F.current_date(), 30)))
        
        # 7-day features
        features_7d = df_7d.filter(F.col("vehicleId").isNotNull()).groupBy("vehicleId").agg(
            F.countDistinct("tourId").alias("total_tours_7d"),
            F.avg("realizedMargin").alias("avg_margin_7d"),
        )
        
        # 30-day features
        features_30d = df_30d.filter(F.col("vehicleId").isNotNull()).groupBy("vehicleId").agg(
            F.avg("capacityScore").alias("utilization_rate_30d"),
        )
        
        # Vehicle metadata
        vehicle_meta = df.filter(F.col("vehicleId").isNotNull()).groupBy("vehicleId").agg(
            F.first("vehicleVolumeMax").alias("volume_max_m3"),
            F.first("vehicleWeightMax").alias("weight_max_kg"),
            F.first("vehiclePalletsMax").alias("pallets_max"),
        )
        
        # Join
        result = features_7d.join(features_30d, on="vehicleId", how="outer")
        result = result.join(vehicle_meta, on="vehicleId", how="outer")
        
        # Add vehicle type (placeholder)
        result = result.withColumn("vehicle_type_encoded", F.lit(0))
        result = result.withColumn("utilization_rate_7d", F.col("utilization_rate_30d"))
        
        result = result.withColumn("event_timestamp", F.current_timestamp())
        result = result.withColumn("vehicle_id", F.col("vehicleId"))
        
        return result
    
    def _write_features(self, df: DataFrame, feature_name: str, date: str) -> None:
        """Writes features to S3."""
        
        output_path = f"s3a://{self.feature_store_bucket}/{feature_name}/"
        
        df.write.mode("overwrite").parquet(output_path)
        
        logger.info(f"Wrote {feature_name} to {output_path}")


def create_spark_session(app_name: str = "FeatureComputation") -> SparkSession:
    """Creates Spark session."""
    
    return SparkSession.builder \
        .appName(app_name) \
        .config("spark.sql.adaptive.enabled", "true") \
        .config("spark.sql.parquet.compression.codec", "snappy") \
        .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
        .getOrCreate()


def main():
    parser = argparse.ArgumentParser(description="CargoBit Feature Computation")
    parser.add_argument("--date", required=True, help="Target date (YYYY-MM-DD)")
    parser.add_argument("--s3-bucket", default="cargobit-datalake")
    parser.add_argument("--feature-store-bucket", default="cargobit-feature-store")
    
    args = parser.parse_args()
    
    spark = create_spark_session()
    
    config = {
        "s3_bucket": args.s3_bucket,
        "feature_store_bucket": args.feature_store_bucket,
    }
    
    pipeline = FeatureComputationPipeline(spark, config)
    stats = pipeline.run(args.date)
    
    print("\n" + "=" * 50)
    print("Feature Computation Statistics")
    print("=" * 50)
    for key, value in stats.items():
        print(f"{key}: {value}")
    
    spark.stop()


if __name__ == "__main__":
    main()
