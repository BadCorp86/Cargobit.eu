# CargoBit ML Service - Load Test Plan

## Overview

Load testing suite for the ML Inference Service using k6.

## Prerequisites

```bash
# Install k6
brew install k6
# or
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Test Scenarios

### Scenario 1: Baseline Scoring
**Focus:** `/score` endpoint latency and throughput
**Target:** P95 < 50ms, P99 < 100ms at 400 RPS

```bash
# Run baseline scoring test
k6 run scenario-1-baseline.js

# Custom configuration
ML_SERVICE_URL=http://ml-service:8080 k6 run scenario-1-baseline.js

# With custom VUs
k6 run --vus 200 --duration 5m scenario-1-baseline.js
```

### Scenario 2: Explainability Load
**Focus:** `/explain` endpoint with SHAP computation
**Target:** P95 < 100ms, P99 < 200ms at 50 RPS

```bash
k6 run scenario-2-explainability.js
```

### Scenario 3: Mixed Traffic
**Focus:** Realistic production traffic (80% /score, 20% /explain)
**Target:** P95 < 60ms overall

```bash
k6 run scenario-3-mixed.js
```

### Scenario 4: Cold Start / Model Reload
**Focus:** Model loading and cache behavior
**Target:** First request < 500ms, subsequent < 50ms

```bash
k6 run scenario-4-coldstart.js
```

## Quick Commands

```bash
# Run all scenarios sequentially
./run-all-tests.sh

# Run single scenario with custom config
k6 run --vus 100 --duration 3m scenario-1-baseline.js

# Run with output to file
k6 run --out json=results.json scenario-1-baseline.js

# Run with InfluxDB output
k6 run --out influxdb=http://influxdb:8086/k6 scenario-1-baseline.js
```

## Performance Targets

| Scenario | Endpoint | Target RPS | P50 | P95 | P99 |
|----------|----------|------------|-----|-----|-----|
| Baseline | /score | 400 | <20ms | <50ms | <100ms |
| Explainability | /explain | 50 | <50ms | <100ms | <200ms |
| Mixed | both | 300 | <30ms | <60ms | <100ms |
| Cold Start | /score | - | - | <500ms | <1000ms |

## Metrics Collected

### Custom Metrics
- `score_latency` - Latency for /score requests
- `explain_latency` - Latency for /explain requests
- `errors` - Error rate
- `cache_hits` - Cache hit count
- `cache_misses` - Cache miss count

### Built-in Metrics
- `http_req_duration` - Total request duration
- `http_req_failed` - Failed request rate
- `vus` - Virtual users
- `iterations` - Total iterations

## Results Analysis

### Terminal Output
k6 outputs a summary table at the end of each test:

```
     ✓ status is 200
     ✓ has scoreMl
     ✓ latency < 50ms
     ✗ latency < 100ms  <-- threshold exceeded

   http_req_duration..............: avg=45.2ms  min=12.3ms  med=38.1ms  max=234.5ms  p(90)=52.3ms  p(95)=67.8ms
   errors.........................: 0.12%
```

### JSON Output
```bash
# Generate detailed JSON report
k6 run --out json=results.json scenario-1-baseline.js

# Analyze with jq
cat results.json | jq 'select(.type=="Point") | select(.metric=="http_req_duration") | .data.value' | \
  awk '{sum+=$1; count++} END {print "Avg:", sum/count, "ms"}'
```

### Grafana Dashboard
Connect k6 to InfluxDB and Grafana for real-time visualization:

```bash
# Run with InfluxDB output
k6 run --out influxdb=http://localhost:8086/k6 scenario-1-baseline.js
```

## Continuous Load Testing

### GitHub Actions Integration
```yaml
# .github/workflows/load-test.yml
name: Load Test

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: grafana/k6-action@v0.3.0
        with:
          filename: scenario-3-mixed.js
        env:
          ML_SERVICE_URL: ${{ secrets.ML_SERVICE_URL }}
```

### Performance Regression Detection
```bash
# Compare against baseline
k6 run scenario-1-baseline.js > current.txt
diff baseline.txt current.txt
```

## Troubleshooting

### High Latency
1. Check model cache: `curl http://localhost:8080/models`
2. Monitor memory usage: `docker stats ml-service`
3. Verify SHAP explainer is pre-loaded

### High Error Rate
1. Check service logs: `docker logs ml-service`
2. Verify health endpoint: `curl http://localhost:8080/health`
3. Check model version: `curl http://localhost:8080/model/info`

### Memory Issues
1. Reduce cache size: `MODEL_CACHE_SIZE=5`
2. Disable SHAP caching for explainability tests
3. Scale horizontally with multiple instances
