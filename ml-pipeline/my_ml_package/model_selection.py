"""
CargoBit ML Package - Model Selection Module
============================================

Model Promotion und Selection für Suggestion Scoring.

Usage:
    from my_ml_package.model_selection import promote_best_model
    
    result = promote_best_model(
        registry_table="ml_model_registry",
        min_auc=0.65,
    )
"""

import logging
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import from parent training module
from training.train_and_register_model import (
    promote_best_model as _promote_best_model,
)

logger = logging.getLogger(__name__)


def promote_best_model(
    registry_table: str,
    min_auc: float = 0.65,
    min_ndcg: float = 0.60,
    **kwargs
):
    """
    Promoted das beste CANDIDATE-Modell zu ACTIVE wenn Metriken passen.
    
    Workflow:
    1. Suche alle CANDIDATE-Modelle in Registry
    2. Sortiere nach AUC (absteigend)
    3. Prüfe Thresholds (min_auc, min_ndcg)
    4. Deprecate alte ACTIVE-Modelle
    5. Setze neues Modell auf ACTIVE
    
    Args:
        registry_table: Name der Model-Registry-Tabelle
        min_auc: Minimum AUC für Promotion (default: 0.65)
        min_ndcg: Minimum NDCG@10 für Promotion (default: 0.60)
        
    Returns:
        Dict mit Promotion-Ergebnis:
        - promoted: bool - Ob Promotion erfolgreich
        - model_version: str - Modell-Version
        - auc: float - AUC Score
        - ndcg: float - NDCG@10 Score
        - reason: str - Grund für Erfolg/Misserfolg
    """
    logger.info(f"Evaluating models for promotion (min_auc={min_auc}, min_ndcg={min_ndcg})")
    
    result = _promote_best_model(
        registry_table=registry_table,
        min_auc=min_auc,
        min_ndcg=min_ndcg,
    )
    
    if result.get("promoted"):
        logger.info(f"Model {result['model_version']} promoted to ACTIVE")
        logger.info(f"AUC={result['auc']:.4f}, NDCG={result.get('ndcg', 0):.4f}")
    else:
        logger.warning(f"Model promotion failed: {result.get('reason', 'Unknown')}")
    
    return result


def get_active_model(registry_table: str = "ml_model_registry") -> dict:
    """
    Gibt das aktuell aktive Modell zurück.
    
    Args:
        registry_table: Name der Model-Registry-Tabelle
        
    Returns:
        Dict mit Modell-Informationen
    """
    import os
    
    if os.getenv("ENVIRONMENT") == "production":
        import snowflake.connector
        from airflow.models import Variable
        
        conn = snowflake.connector.connect(
            user=Variable.get('snowflake_user'),
            password=Variable.get('snowflake_password'),
            account=Variable.get('snowflake_account'),
            warehouse='ML_WH',
            database='CARGOBIT_ML',
            schema='MODELS',
        )
        
        cursor = conn.cursor()
        
        try:
            cursor.execute(f"""
                SELECT model_version, algorithm, metric_auc, metric_ndcg_10, 
                       created_at, promoted_at
                FROM {registry_table}
                WHERE status = 'ACTIVE'
                ORDER BY promoted_at DESC
                LIMIT 1
            """)
            
            result = cursor.fetchone()
            
            if result:
                return {
                    "model_version": result[0],
                    "algorithm": result[1],
                    "auc": float(result[2]),
                    "ndcg_10": float(result[3]),
                    "created_at": result[4].isoformat() if result[4] else None,
                    "promoted_at": result[5].isoformat() if result[5] else None,
                }
            
            return None
            
        finally:
            cursor.close()
            conn.close()
    else:
        # Development mock
        return {
            "model_version": "v20260419_mock",
            "algorithm": "LIGHTGBM",
            "auc": 0.72,
            "ndcg_10": 0.65,
            "created_at": "2026-04-19T10:00:00Z",
            "promoted_at": "2026-04-19T10:05:00Z",
        }


def list_candidate_models(registry_table: str = "ml_model_registry") -> list:
    """
    Listet alle CANDIDATE-Modelle auf.
    
    Args:
        registry_table: Name der Model-Registry-Tabelle
        
    Returns:
        Liste von Dicts mit Modell-Informationen
    """
    import os
    
    if os.getenv("ENVIRONMENT") == "production":
        import snowflake.connector
        from airflow.models import Variable
        
        conn = snowflake.connector.connect(
            user=Variable.get('snowflake_user'),
            password=Variable.get('snowflake_password'),
            account=Variable.get('snowflake_account'),
            warehouse='ML_WH',
            database='CARGOBIT_ML',
            schema='MODELS',
        )
        
        cursor = conn.cursor()
        
        try:
            cursor.execute(f"""
                SELECT model_version, algorithm, metric_auc, metric_ndcg_10, created_at
                FROM {registry_table}
                WHERE status = 'CANDIDATE'
                ORDER BY metric_auc DESC, created_at DESC
            """)
            
            results = cursor.fetchall()
            
            return [
                {
                    "model_version": r[0],
                    "algorithm": r[1],
                    "auc": float(r[2]),
                    "ndcg_10": float(r[3]),
                    "created_at": r[4].isoformat() if r[4] else None,
                }
                for r in results
            ]
            
        finally:
            cursor.close()
            conn.close()
    else:
        # Development mock
        return [
            {
                "model_version": "v20260419_candidate1",
                "algorithm": "LIGHTGBM",
                "auc": 0.71,
                "ndcg_10": 0.64,
                "created_at": "2026-04-19T09:00:00Z",
            },
        ]


def rollback_model(
    registry_table: str = "ml_model_registry",
    target_version: str = None,
) -> dict:
    """
    Rollback zu einer vorherigen Modell-Version.
    
    Args:
        registry_table: Name der Model-Registry-Tabelle
        target_version: Optional: Spezifische Version für Rollback
        
    Returns:
        Dict mit Rollback-Ergebnis
    """
    logger.info(f"Initiating model rollback to {target_version or 'previous version'}")
    
    import os
    
    if os.getenv("ENVIRONMENT") == "production":
        import snowflake.connector
        from airflow.models import Variable
        
        conn = snowflake.connector.connect(
            user=Variable.get('snowflake_user'),
            password=Variable.get('snowflake_password'),
            account=Variable.get('snowflake_account'),
            warehouse='ML_WH',
            database='CARGOBIT_ML',
            schema='MODELS',
        )
        
        cursor = conn.cursor()
        
        try:
            # Get current active model
            cursor.execute(f"""
                SELECT model_version FROM {registry_table}
                WHERE status = 'ACTIVE'
                ORDER BY promoted_at DESC
                LIMIT 1
            """)
            current_active = cursor.fetchone()
            
            if not current_active:
                return {"success": False, "reason": "No active model found"}
            
            current_version = current_active[0]
            
            # Find target version
            if target_version:
                # Verify target exists
                cursor.execute(f"""
                    SELECT model_version FROM {registry_table}
                    WHERE model_version = %s AND status IN ('DEPRECATED', 'ROLLED_BACK')
                """, (target_version,))
                
                if not cursor.fetchone():
                    return {"success": False, "reason": f"Target version {target_version} not found"}
            else:
                # Get previous version
                cursor.execute(f"""
                    SELECT model_version FROM {registry_table}
                    WHERE status = 'DEPRECATED'
                    ORDER BY deprecated_at DESC
                    LIMIT 1
                """)
                
                result = cursor.fetchone()
                if not result:
                    return {"success": False, "reason": "No previous version available for rollback"}
                
                target_version = result[0]
            
            # Set current to ROLLED_BACK
            cursor.execute(f"""
                UPDATE {registry_table}
                SET status = 'ROLLED_BACK', rolled_back_at = CURRENT_TIMESTAMP()
                WHERE model_version = %s
            """, (current_version,))
            
            # Set target to ACTIVE
            cursor.execute(f"""
                UPDATE {registry_table}
                SET status = 'ACTIVE', restored_at = CURRENT_TIMESTAMP()
                WHERE model_version = %s
            """, (target_version,))
            
            conn.commit()
            
            logger.info(f"Rollback complete: {current_version} → {target_version}")
            
            return {
                "success": True,
                "previous_version": current_version,
                "new_version": target_version,
            }
            
        finally:
            cursor.close()
            conn.close()
    else:
        # Development mock
        return {
            "success": True,
            "previous_version": "v20260419_active",
            "new_version": target_version or "v20260418_previous",
        }
