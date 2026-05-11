"""PostCheck evaluation logic for health score calculation."""

import requests
from typing import Dict, Any


def query_prometheus(prom_url: str, query: str) -> float:
    """Query Prometheus and return the result value."""
    try:
        response = requests.get(
            f"{prom_url}/api/v1/query",
            params={"query": query},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        if data["status"] == "success" and data["data"]["result"]:
            return float(data["data"]["result"][0]["value"][1])
        return 0.0
    except Exception as e:
        print(f"Prometheus query error: {e}")
        return 0.0


def calculate_score(value: float, thresholds: Dict[str, float]) -> float:
    """Calculate score based on value and thresholds."""
    if value >= thresholds.get("excellent", 100):
        return 100.0
    elif value >= thresholds.get("good", 80):
        return 80.0 + (value - thresholds["good"]) * 20 / (thresholds["excellent"] - thresholds["good"])
    elif value >= thresholds.get("acceptable", 60):
        return 60.0 + (value - thresholds["acceptable"]) * 20 / (thresholds["good"] - thresholds["acceptable"])
    else:
        return max(0, value)


def evaluate_health_score(
    prom_url: str,
    partner: str,
    endpoint: str,
    region: str,
    window: int = 300
) -> Dict[str, Any]:
    """
    Evaluate health score for a partner/endpoint/region combination.
    
    Health Score Formula:
    H = 0.25×L + 0.35×E + 0.20×S + 0.10×R + 0.10×A
    
    Where:
    - L = Latency Score (P95 ≤ 35ms → 100)
    - E = Error Rate Score (≤ 0.5% → 100)
    - S = Success Ratio Score (≥ 99.5% → 100)
    - R = Resource Usage Score (CPU < 60% → 100)
    - A = Anomaly Score (no anomalies → 100)
    """
    components = {}
    
    # L = Latency Score (P95 latency in ms, target ≤ 35ms)
    latency_query = f'''
        histogram_quantile(0.95,
            sum(rate(proxy_request_duration_seconds_bucket{{partner="{partner}",endpoint="{endpoint}",region="{region}"}}[{window}s]))
            by (le)
        ) * 1000
    '''
    latency_p95 = query_prometheus(prom_url, latency_query)
    latency_score = max(0, 100 - (latency_p95 - 35) * 2) if latency_p95 > 0 else 100
    latency_score = min(100, latency_score)
    components["latency"] = {
        "p95_ms": latency_p95,
        "score": latency_score
    }
    
    # E = Error Rate Score (target ≤ 0.5%)
    error_query = f'''
        sum(rate(proxy_requests_total{{partner="{partner}",endpoint="{endpoint}",region="{region}",status=~"5.."}}[{window}s]))
        /
        sum(rate(proxy_requests_total{{partner="{partner}",endpoint="{endpoint}",region="{region}"}}[{window}s]))
        * 100
    '''
    error_rate = query_prometheus(prom_url, error_query)
    error_score = max(0, 100 - error_rate * 20) if error_rate > 0 else 100
    error_score = min(100, error_score)
    components["error_rate"] = {
        "rate_percent": error_rate,
        "score": error_score
    }
    
    # S = Success Ratio Score (target ≥ 99.5%)
    success_query = f'''
        sum(rate(proxy_requests_total{{partner="{partner}",endpoint="{endpoint}",region="{region}",status!~"5.."}}[{window}s]))
        /
        sum(rate(proxy_requests_total{{partner="{partner}",endpoint="{endpoint}",region="{region}"}}[{window}s]))
        * 100
    '''
    success_ratio = query_prometheus(prom_url, success_query)
    success_score = min(100, success_ratio)
    components["success_ratio"] = {
        "ratio_percent": success_ratio,
        "score": success_score
    }
    
    # R = Resource Usage Score (CPU target < 60%)
    cpu_query = f'''
        avg(rate(container_cpu_usage_seconds_total{{namespace="governance",pod=~"governance-postcheck.*"}}[{window}s]))
        * 100
    '''
    cpu_usage = query_prometheus(prom_url, cpu_query)
    resource_score = max(0, 100 - cpu_usage)
    components["resource_usage"] = {
        "cpu_percent": cpu_usage,
        "score": resource_score
    }
    
    # A = Anomaly Score (no anomalies detected → 100)
    anomaly_query = f'''
        sum(increase(proxy_anomalies_total{{partner="{partner}",endpoint="{endpoint}",region="{region}"}}[{window}s]))
    '''
    anomalies = query_prometheus(prom_url, anomaly_query)
    anomaly_score = 100 if anomalies == 0 else max(0, 100 - anomalies * 10)
    components["anomalies"] = {
        "count": anomalies,
        "score": anomaly_score
    }
    
    # Calculate overall health score
    health_score = (
        0.25 * latency_score +
        0.35 * error_score +
        0.20 * success_score +
        0.10 * resource_score +
        0.10 * anomaly_score
    )
    
    return {
        "health_score": round(health_score, 2),
        "components": components
    }
