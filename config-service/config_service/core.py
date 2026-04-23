"""
CargoBit Config Service - Core Service
=======================================

Zentraler Service für Config-Management mit:
- Schema-Validierung via Pydantic
- Git-basiertes Versioning
- Hot-Reload via File-Watcher
- Audit-Logging
"""

import hashlib
import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml
from pydantic import ValidationError

from .models import (
    ScoringConfig,
    ScoringWeights,
    FeatureFlags,
    MLHybridConfig,
    ConfigValidationResponse,
    ConfigVersion,
    ConfigDiff,
)


class ConfigServiceError(Exception):
    """Base exception for Config Service errors."""
    pass


class ConfigValidationError(ConfigServiceError):
    """Raised when config validation fails."""
    pass


class ConfigVersionError(ConfigServiceError):
    """Raised when version operations fail."""
    pass


class ConfigService:
    """
    Zentraler Config-Service für Scoring-Konfiguration.
    
    Features:
    - YAML-basierte Konfiguration
    - Schema-Validierung mit Pydantic
    - Git-basiertes Versioning
    - Hot-Reload via File-Watcher
    - Audit-Logging
    
    Usage:
        service = ConfigService(config_path="./config/scoring-config.yaml")
        config = service.get_config()
        weights = service.get_active_weights(tenant_id="TENANT_DE_NORTH")
    """
    
    def __init__(
        self,
        config_path: str = "./config/scoring-config.yaml",
        versioning_enabled: bool = True,
        audit_enabled: bool = True,
    ):
        """
        Initialisiert den Config-Service.
        
        Args:
            config_path: Pfad zur YAML-Konfigurationsdatei
            versioning_enabled: Aktiviert Git-basiertes Versioning
            audit_enabled: Aktiviert Audit-Logging
        """
        self.config_path = Path(config_path)
        self.versioning_enabled = versioning_enabled
        self.audit_enabled = audit_enabled
        
        # Config-Status
        self._config: Optional[ScoringConfig] = None
        self._last_modified: Optional[float] = None
        self._checksum: Optional[str] = None
        
        # Versioning
        self._version_history: List[ConfigVersion] = []
        self._versions_dir = self.config_path.parent / ".versions"
        
        # Cache für schnelle Zugriffe
        self._weights_cache: Dict[str, ScoringWeights] = {}
        
        # Initial Load
        self.reload()
        
        # Create versions directory
        if versioning_enabled:
            self._versions_dir.mkdir(parents=True, exist_ok=True)
    
    # =========================================================================
    # CORE OPERATIONS
    # =========================================================================
    
    def reload(self) -> bool:
        """
        Lädt die Konfiguration neu von Disk.
        
        Returns:
            True wenn erfolgreich, False wenn keine Änderung
        """
        if not self.config_path.exists():
            raise ConfigServiceError(f"Config file not found: {self.config_path}")
        
        # Prüfe ob sich Datei geändert hat
        current_mtime = self.config_path.stat().st_mtime
        if self._last_modified and current_mtime <= self._last_modified:
            return False  # Keine Änderung
        
        # Lade YAML
        with open(self.config_path, 'r', encoding='utf-8') as f:
            raw_config = yaml.safe_load(f)
        
        # Berechne Checksum
        config_str = yaml.dump(raw_config, sort_keys=True)
        new_checksum = hashlib.sha256(config_str.encode()).hexdigest()[:16]
        
        # Validiere mit Pydantic
        try:
            validated_config = ScoringConfig(**raw_config)
        except ValidationError as e:
            raise ConfigValidationError(f"Config validation failed: {e}")
        
        # Aktualisiere State
        old_config = self._config
        self._config = validated_config
        self._last_modified = current_mtime
        self._checksum = new_checksum
        
        # Clear Cache
        self._weights_cache.clear()
        
        # Version speichern
        if self.versioning_enabled and old_config is not None:
            self._save_version(old_config)
        
        return True
    
    def get_config(self) -> ScoringConfig:
        """
        Gibt die aktuelle Konfiguration zurück.
        
        Returns:
            Aktuelle ScoringConfig
        """
        if self._config is None:
            self.reload()
        return self._config
    
    def get_raw_config(self) -> Dict[str, Any]:
        """
        Gibt die Roh-Konfiguration als Dict zurück.
        
        Returns:
            Dictionary mit roher Konfiguration
        """
        with open(self.config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    # =========================================================================
    # SCORING OPERATIONS
    # =========================================================================
    
    def get_active_weights(
        self,
        tenant_id: Optional[str] = None,
        profile_id: Optional[str] = None
    ) -> ScoringWeights:
        """
        Ermittelt die aktiven Scoring-Gewichte.
        
        Args:
            tenant_id: Optional Tenant-ID für Override-Lookup
            profile_id: Optional Profile-ID für explizite Profilauswahl
            
        Returns:
            Aktive ScoringWeights
        """
        config = self.get_config()
        
        # Cache-Key
        cache_key = f"{tenant_id or 'default'}:{profile_id or 'default'}"
        if cache_key in self._weights_cache:
            return self._weights_cache[cache_key]
        
        # Explizite Profil-Auswahl hat höchste Priorität
        if profile_id:
            for profile in config.spec.profiles:
                if profile.id == profile_id:
                    self._weights_cache[cache_key] = profile.weights
                    return profile.weights
        
        # Sonst über Config-Logik
        weights = config.get_active_weights(tenant_id)
        self._weights_cache[cache_key] = weights
        return weights
    
    def get_feature_flags(self) -> FeatureFlags:
        """Gibt die aktuellen Feature-Flags zurück."""
        return self.get_config().spec.features
    
    def get_ml_hybrid_config(self) -> MLHybridConfig:
        """Gibt die ML-Hybrid-Konfiguration zurück."""
        return self.get_config().spec.mlHybrid
    
    def get_matching_config(self):
        """Gibt die Matching-Konfiguration zurück."""
        return self.get_config().spec.matching
    
    def calculate_score(
        self,
        scores: Dict[str, float],
        tenant_id: Optional[str] = None,
        profile_id: Optional[str] = None
    ) -> float:
        """
        Berechnet den gewichteten Gesamt-Score.
        
        Args:
            scores: Dictionary mit Teil-Scores (revenue, capacityUtilization, etc.)
            tenant_id: Optional Tenant-ID
            profile_id: Optional Profile-ID
            
        Returns:
            Gewichteter Gesamt-Score (0-1)
        """
        weights = self.get_active_weights(tenant_id, profile_id)
        
        total_score = (
            weights.revenue * scores.get('revenue', 0.0) +
            weights.capacityUtilization * scores.get('capacityUtilization', 0.0) +
            weights.priority * scores.get('priority', 0.0) +
            weights.risk * scores.get('risk', 0.0) +
            weights.serviceLevel * scores.get('serviceLevel', 0.0) +
            weights.co2 * scores.get('co2', 0.0)
        )
        
        return round(total_score, 4)
    
    # =========================================================================
    # VALIDATION
    # =========================================================================
    
    def validate_config(self, config_dict: Optional[Dict[str, Any]] = None) -> ConfigValidationResponse:
        """
        Validiert eine Konfiguration.
        
        Args:
            config_dict: Zu validierende Config. None = aktuelle Config validieren.
            
        Returns:
            ConfigValidationResponse mit Validierungsergebnis
        """
        if config_dict is None:
            config_dict = self.get_raw_config()
        
        errors = []
        warnings = []
        weights_sum = 0.0
        
        try:
            # Pydantic-Validierung
            validated = ScoringConfig(**config_dict)
            
            # Zusätzliche Business-Validierung
            weights = validated.spec.scoring.get('weights', {})
            weights_sum = sum(weights.values())
            
            # Prüfe auf ungewöhnliche Gewichtungen
            for key, value in weights.items():
                if value > 0.5:
                    warnings.append(f"High weight for '{key}' ({value}). Consider balancing.")
                if value == 0.0:
                    warnings.append(f"Zero weight for '{key}'. This dimension is effectively disabled.")
            
        except ValidationError as e:
            for error in e.errors():
                loc = ' -> '.join(str(x) for x in error['loc'])
                errors.append(f"{loc}: {error['msg']}")
        except Exception as e:
            errors.append(str(e))
        
        return ConfigValidationResponse(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            weightsSum=round(weights_sum, 4)
        )
    
    # =========================================================================
    # VERSIONING
    # =========================================================================
    
    def _save_version(self, config: ScoringConfig) -> str:
        """
        Speichert eine neue Version der Konfiguration.
        
        Args:
            config: Die zu speichernde Konfiguration
            
        Returns:
            Version-String
        """
        # Increment version
        current_version = config.version
        major, minor, patch = map(int, current_version.split('.'))
        new_version = f"{major}.{minor}.{patch + 1}"
        
        # Create version file
        version_file = self._versions_dir / f"scoring-config-v{new_version}.yaml"
        
        # Copy current config
        shutil.copy(self.config_path, version_file)
        
        # Add to history
        config_version = ConfigVersion(
            version=new_version,
            createdAt=datetime.utcnow(),
            createdBy=config.metadata.lastUpdatedBy,
            changeReason=config.metadata.changeReason or "Automated version",
            checksum=self._checksum or "unknown"
        )
        self._version_history.append(config_version)
        
        # Save history
        history_file = self._versions_dir / "history.json"
        with open(history_file, 'w') as f:
            json.dump([v.model_dump() for v in self._version_history], f, default=str, indent=2)
        
        return new_version
    
    def get_version_history(self, limit: int = 20) -> List[ConfigVersion]:
        """
        Gibt die Versionshistorie zurück.
        
        Args:
            limit: Maximale Anzahl zurückgegebener Versionen
            
        Returns:
            Liste von ConfigVersion-Objekten
        """
        return self._version_history[-limit:]
    
    def rollback(self, version: str) -> bool:
        """
        Führt ein Rollback auf eine bestimmte Version durch.
        
        Args:
            version: Ziel-Version für Rollback
            
        Returns:
            True wenn erfolgreich
        """
        version_file = self._versions_dir / f"scoring-config-v{version}.yaml"
        
        if not version_file.exists():
            raise ConfigVersionError(f"Version {version} not found")
        
        # Backup current
        backup_file = self._versions_dir / f"backup-{datetime.utcnow().isoformat()}.yaml"
        shutil.copy(self.config_path, backup_file)
        
        # Restore version
        shutil.copy(version_file, self.config_path)
        
        # Reload
        self.reload()
        
        return True
    
    def get_diff(self, version1: str, version2: str) -> List[ConfigDiff]:
        """
        Vergleicht zwei Versionen.
        
        Args:
            version1: Erste Version
            version2: Zweite Version
            
        Returns:
            Liste von ConfigDiff-Objekten
        """
        v1_file = self._versions_dir / f"scoring-config-v{version1}.yaml"
        v2_file = self._versions_dir / f"scoring-config-v{version2}.yaml"
        
        if not v1_file.exists() or not v2_file.exists():
            raise ConfigVersionError("One or both versions not found")
        
        with open(v1_file, 'r') as f:
            config1 = yaml.safe_load(f)
        with open(v2_file, 'r') as f:
            config2 = yaml.safe_load(f)
        
        return self._compute_diff(config1, config2)
    
    def _compute_diff(
        self,
        old: Dict[str, Any],
        new: Dict[str, Any],
        path: str = ""
    ) -> List[ConfigDiff]:
        """Berechnet Diff zwischen zwei Config-Dicts."""
        diffs = []
        
        all_keys = set(old.keys()) | set(new.keys())
        
        for key in all_keys:
            current_path = f"{path}.{key}" if path else key
            
            if key not in old:
                diffs.append(ConfigDiff(
                    field=current_path,
                    oldValue=None,
                    newValue=new[key],
                    impact="medium"
                ))
            elif key not in new:
                diffs.append(ConfigDiff(
                    field=current_path,
                    oldValue=old[key],
                    newValue=None,
                    impact="high"
                ))
            elif old[key] != new[key]:
                if isinstance(old[key], dict) and isinstance(new[key], dict):
                    diffs.extend(self._compute_diff(old[key], new[key], current_path))
                else:
                    # Bestimme Impact
                    impact = "low"
                    if 'weight' in key.lower() or 'threshold' in key.lower():
                        impact = "high"
                    elif 'feature' in key.lower():
                        impact = "medium"
                    
                    diffs.append(ConfigDiff(
                        field=current_path,
                        oldValue=old[key],
                        newValue=new[key],
                        impact=impact
                    ))
        
        return diffs
    
    # =========================================================================
    # UPDATE OPERATIONS
    # =========================================================================
    
    def update_weights(
        self,
        weights: ScoringWeights,
        updated_by: str,
        change_reason: str
    ) -> ScoringConfig:
        """
        Aktualisiert die Scoring-Gewichte.
        
        Args:
            weights: Neue Gewichte
            updated_by: User der die Änderung durchführt
            change_reason: Begründung für die Änderung
            
        Returns:
            Aktualisierte Konfiguration
        """
        # Validiere neue Gewichte
        weights.model_validate(weights.model_dump())
        
        # Lade aktuelle Config
        config_dict = self.get_raw_config()
        
        # Backup
        if self.versioning_enabled:
            self._save_version(self._config)
        
        # Update weights
        config_dict['spec']['scoring']['weights'] = weights.model_dump()
        config_dict['metadata']['lastUpdatedBy'] = updated_by
        config_dict['metadata']['lastUpdatedAt'] = datetime.utcnow().isoformat()
        config_dict['metadata']['changeReason'] = change_reason
        
        # Increment version
        current = config_dict['version']
        major, minor, patch = map(int, current.split('.'))
        config_dict['version'] = f"{major}.{minor + 1}.0"
        
        # Validiere neue Config
        validated = ScoringConfig(**config_dict)
        
        # Speichere
        with open(self.config_path, 'w', encoding='utf-8') as f:
            yaml.dump(config_dict, f, sort_keys=False, allow_unicode=True)
        
        # Reload
        self.reload()
        
        return validated
    
    def update_feature_flags(
        self,
        features: FeatureFlags,
        updated_by: str,
        change_reason: str
    ) -> ScoringConfig:
        """
        Aktualisiert die Feature-Flags.
        
        Args:
            features: Neue Feature-Flags
            updated_by: User der die Änderung durchführt
            change_reason: Begründung für die Änderung
            
        Returns:
            Aktualisierte Konfiguration
        """
        config_dict = self.get_raw_config()
        
        # Backup
        if self.versioning_enabled:
            self._save_version(self._config)
        
        # Update features
        config_dict['spec']['features'] = features.model_dump()
        config_dict['metadata']['lastUpdatedBy'] = updated_by
        config_dict['metadata']['lastUpdatedAt'] = datetime.utcnow().isoformat()
        config_dict['metadata']['changeReason'] = change_reason
        
        # Increment version (minor for feature changes)
        current = config_dict['version']
        major, minor, patch = map(int, current.split('.'))
        config_dict['version'] = f"{major}.{minor + 1}.0"
        
        # Validiere und speichere
        validated = ScoringConfig(**config_dict)
        
        with open(self.config_path, 'w', encoding='utf-8') as f:
            yaml.dump(config_dict, f, sort_keys=False, allow_unicode=True)
        
        self.reload()
        
        return validated
    
    # =========================================================================
    # HEALTH & STATUS
    # =========================================================================
    
    def health_check(self) -> Dict[str, Any]:
        """
        Führt einen Health-Check durch.
        
        Returns:
            Health-Status Dictionary
        """
        try:
            config = self.get_config()
            validation = self.validate_config()
            
            return {
                "status": "healthy" if validation.valid else "degraded",
                "version": config.version,
                "checksum": self._checksum,
                "lastModified": datetime.fromtimestamp(self._last_modified).isoformat() if self._last_modified else None,
                "validation": validation.model_dump(),
                "versionCount": len(self._version_history),
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    def get_status(self) -> Dict[str, Any]:
        """
        Gibt detaillierten Status zurück.
        
        Returns:
            Status Dictionary
        """
        config = self.get_config()
        
        return {
            "version": config.version,
            "metadata": config.metadata.model_dump(),
            "features": config.spec.features.model_dump(),
            "mlHybrid": config.spec.mlHybrid.model_dump(),
            "profiles": [p.id for p in config.spec.profiles],
            "tenantOverrides": len(config.spec.tenantOverrides),
            "matching": config.spec.matching.model_dump(),
        }
