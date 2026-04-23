# CargoBit Config Service

Zentraler Service für Scoring-Konfiguration mit Schema-Validierung, Versioning und Hot-Reload.

## Features

- **Schema-Validierung**: Pydantic-Modelle für typsichere Konfiguration
- **Versioning**: Git-basiertes Versioning mit Rollback-Support
- **Hot-Reload**: Automatisches Nachladen bei Config-Änderungen
- **REST-API**: FastAPI-basierte API für Config-Management
- **Audit-Logging**: Nachvollziehbarkeit aller Config-Änderungen

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                     Config Service                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │
│  │    API       │   │    Core      │   │  Versioning  │     │
│  │  (FastAPI)   │──▶│   Service    │──▶│   (Git)      │     │
│  └──────────────┘   └──────────────┘   └──────────────┘     │
│         │                   │                   │            │
│         ▼                   ▼                   ▼            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │
│  │  Validation  │   │    Cache     │   │   History    │     │
│  │  (Pydantic)  │   │   (In-Mem)   │   │   (JSON)     │     │
│  └──────────────┘   └──────────────┘   └──────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  ConfigMap (K8s) │
                    │  scoring-config  │
                    └──────────────────┘
```

## API Endpoints

### Health

```bash
# Health Check
GET /health

# Readiness Check
GET /ready

# Status
GET /status
```

### Config Management

```bash
# Get current config
GET /api/v1/config

# Get weights
GET /api/v1/config/weights?tenant_id=TENANT_DE_NORTH

# Update weights
PUT /api/v1/config/weights
{
  "weights": {
    "revenue": 0.35,
    "capacityUtilization": 0.20,
    "priority": 0.10,
    "risk": 0.10,
    "serviceLevel": 0.15,
    "co2": 0.10
  },
  "updatedBy": "sergej",
  "changeReason": "Adjusting revenue weight for Q2 optimization"
}

# Get feature flags
GET /api/v1/config/features

# Update feature flags
PUT /api/v1/config/features
{
  "features": {
    "enableLearningToRank": true
  },
  "updatedBy": "sergej",
  "changeReason": "Enabling ML-based ranking for production"
}
```

### Scoring

```bash
# Calculate weighted score
POST /api/v1/scoring/calculate
{
  "scores": {
    "revenue": 0.8,
    "capacityUtilization": 0.6,
    "priority": 0.5,
    "risk": 0.7,
    "serviceLevel": 0.4,
    "co2": 0.9
  },
  "tenantId": "TENANT_DE_NORTH"
}
```

### Versioning

```bash
# Get version history
GET /api/v1/config/versions

# Rollback to version
POST /api/v1/config/rollback
{
  "version": "1.2.0",
  "reason": "Reverting failed configuration change"
}

# Compare versions
GET /api/v1/config/diff/1.0.0/1.1.0
```

### Profiles & Tenants

```bash
# Get all profiles
GET /api/v1/config/profiles

# Get specific profile
GET /api/v1/config/profiles/revenue_focused

# Get tenant overrides
GET /api/v1/config/tenants

# Get tenant config
GET /api/v1/config/tenants/TENANT_DE_NORTH
```

## Konfiguration

### Scoring-Config YAML

```yaml
version: 1.0.0
kind: scoring-config

metadata:
  name: capacity-matching-scoring
  description: Scoring-Konfiguration für kapazitätsbasiertes Matching
  owner: product-logistics

spec:
  scoring:
    weights:
      revenue: 0.35
      capacityUtilization: 0.20
      priority: 0.10
      risk: 0.10
      serviceLevel: 0.15
      co2: 0.10
    
    constraints:
      sumEquals: 1.0
      minValue: 0.0
      maxValue: 1.0

  features:
    enableHybridScoring: true
    enableLearningToRank: false

  profiles:
    - id: revenue_focused
      name: "Revenue-Fokus"
      isDefault: true
      weights: { ... }

  tenantOverrides:
    - tenantId: "TENANT_DE_NORTH"
      profileId: "sustainability"
```

## Deployment

### Docker

```bash
# Build
docker build -t cargobit/config-service:1.0.0 .

# Run
docker run -p 8080:8080 \
  -v $(pwd)/config:/app/config \
  cargobit/config-service:1.0.0
```

### Kubernetes (Helm)

```bash
# Install
helm install config-service ./helm/core/config-service \
  --namespace cargobit \
  --set replicaCount=2

# Upgrade
helm upgrade config-service ./helm/core/config-service \
  --namespace cargobit \
  --set image.tag=1.1.0
```

### ConfigMap Hot-Reload

Der Service überwacht die Config-Datei alle 5 Sekunden. Bei Änderungen wird die Konfiguration automatisch neu geladen.

Für Kubernetes: Nutze [Reloader](https://github.com/stakater/Reloader) für automatische Pod-Restarts bei ConfigMap-Änderungen.

## Integration

### Python Client

```python
from config_service.scoring_integration import SyncScoringClient

# Initialize client
client = SyncScoringClient(config_service_url="http://config-service:8080")

# Calculate score
result = client.score_detailed(
    order_data={
        'price': 150,
        'volumeM3': 5,
        'priority': 'PREMIUM',
        'riskLevel': 'LOW'
    },
    tour_data={
        'detourKm': 12,
        'freeCapacityM3': 10
    },
    tenant_id="TENANT_DE_NORTH"
)

print(f"Total Score: {result.totalScore}")
print(f"Heuristic: {result.heuristicScore}")
print(f"ML Score: {result.mlScore}")
```

### Async Client

```python
from config_service.scoring_integration import ConfigServiceClient, HybridScoringService

# Initialize
config_client = ConfigServiceClient(base_url="http://config-service:8080")
scoring_service = HybridScoringService(config_client)

# Calculate score
result = await scoring_service.score(
    order_data={...},
    tour_data={...},
    tenant_id="TENANT_DE_NORTH"
)
```

## Validierung

### Constraints

- **Summe der Gewichte**: Muss genau 1.0 ergeben
- **Wertebereich**: Jedes Gewicht zwischen 0.0 und 1.0
- **Precision**: Maximal 2 Nachkommastellen

### API-Validierung

```bash
# Validate current config
POST /api/v1/config/validate

# Validate custom config
POST /api/v1/config/validate
{
  "version": "1.0.0",
  "spec": { ... }
}
```

## Monitoring

### Metrics

Der Service exportiert Prometheus-Metrics:

```
# Config loaded successfully
config_service_load_success_total 1

# Config validation errors
config_service_validation_errors_total 0

# API requests
http_requests_total{method="GET", endpoint="/api/v1/config"} 150
```

### Grafana Dashboard

Importiere das Dashboard aus `./grafana/config-service.json` für:
- Config-Version
- Validation-Status
- API-Latenz
- Cache-Hit-Rate

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn config_service.api:app --reload --port 8080

# Run tests
pytest tests/ -v --cov=config_service

# Format code
black config_service/ tests/
isort config_service/ tests/
```

## Sicherheit

- **Read-Only ConfigMap**: Config wird als read-only gemountet
- **Non-Root User**: Container läuft als nicht-privilegierter User
- **Network Policy**: Ingress nur aus CargoBit-Namespace
- **Audit**: Alle Änderungen werden protokolliert

## License

Copyright © 2025 CargoBit GmbH
