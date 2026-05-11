# governance-postcheck

A minimal Python service for automated Canary PostChecks in Governance workflows.

## Overview

The `governance-postcheck` service evaluates health scores for partner/endpoint/region combinations before canary promotions. It queries Prometheus metrics and calculates a composite health score.

## Health Score Formula

```
H = 0.25×L + 0.35×E + 0.20×S + 0.10×R + 0.10×A
```

| Component | Weight | Target | Description |
|-----------|--------|--------|-------------|
| L (Latency) | 25% | P95 ≤ 35ms | 95th percentile request latency |
| E (Error Rate) | 35% | ≤ 0.5% | 5xx error rate |
| S (Success Ratio) | 20% | ≥ 99.5% | Successful request ratio |
| R (Resource Usage) | 10% | CPU < 60% | Container resource utilization |
| A (Anomaly Score) | 10% | 0 anomalies | Detected anomalies count |

## API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{"status": "healthy", "service": "governance-postcheck"}
```

### `GET /ready`
Readiness check endpoint.

**Response:**
```json
{"status": "ready", "prom_url": "http://localhost:9090"}
```

### `POST /postcheck`
Evaluate health score for a canary promotion.

**Request:**
```json
{
    "partner": "p",
    "endpoint": "e",
    "region": "r",
    "required_health": 85,
    "window": 300
}
```

**Response:**
```json
{
    "passed": true,
    "health_score": 92.5,
    "required_health": 85,
    "components": {
        "latency": {"p95_ms": 25.0, "score": 100},
        "error_rate": {"rate_percent": 0.3, "score": 94.0},
        "success_ratio": {"ratio_percent": 99.7, "score": 99.7},
        "resource_usage": {"cpu_percent": 45.0, "score": 55.0},
        "anomalies": {"count": 0, "score": 100}
    }
}
```

## Quick Start

### Local Development

```bash
# Install dependencies
pip install -r app/requirements.txt

# Set environment
export PROM_URL=http://localhost:9090

# Run locally
python app/main.py
```

### Docker

```bash
# Build
docker build -t governance-postcheck:local .

# Run
docker run -e PROM_URL=http://prometheus:9090 -p 8443:8443 governance-postcheck:local
```

### Kubernetes

```bash
# Apply deployment
kubectl apply -f k8s/deployment.yaml

# Test
kubectl port-forward -n governance svc/governance-postcheck 8443:8443
curl http://localhost:8443/health
```

## Testing

```bash
# Run unit tests
pip install pytest pytest-cov
pytest tests/ -v --cov=app
```

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PROM_URL` | `http://localhost:9090` | Prometheus server URL |
| `PORT` | `8443` | Server port |

## CI/CD

This repository includes CI pipelines for:

- **GitHub Actions**: `.github/workflows/postcheck-ci-keyless.yml`
- **GitLab CI**: `.gitlab-ci.yml`

Both pipelines:
1. Run unit tests
2. Build container image
3. Scan with Trivy
4. Sign with cosign (keyless OIDC)
5. Push to registry

## Security

### Signing Strategy

**Keyless Signing (Recommended)**: Uses OIDC tokens from GitHub Actions or GitLab CI. No private keys in CI secrets.

### Key Rotation

See `SECURITY/KEY_ROTATION.md` for:
- Key rotation policy
- Secret management
- Incident response procedures

## License

MIT License
