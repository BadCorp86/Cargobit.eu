"""Unit tests for governance-postcheck service."""

import pytest
from unittest.mock import patch, MagicMock
import json

from app.postcheck import evaluate_health_score, calculate_score, query_prometheus


class TestQueryPrometheus:
    """Tests for Prometheus query function."""
    
    @patch("app.postcheck.requests.get")
    def test_query_prometheus_success(self, mock_get):
        """Test successful Prometheus query."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "data": {
                "result": [
                    {"value": [1234567890, "42.5"]}
                ]
            }
        }
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response
        
        result = query_prometheus("http://localhost:9090", "up")
        
        assert result == 42.5
        mock_get.assert_called_once()
    
    @patch("app.postcheck.requests.get")
    def test_query_prometheus_no_result(self, mock_get):
        """Test Prometheus query with no results."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "data": {"result": []}
        }
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response
        
        result = query_prometheus("http://localhost:9090", "up")
        
        assert result == 0.0
    
    @patch("app.postcheck.requests.get")
    def test_query_prometheus_error(self, mock_get):
        """Test Prometheus query with error."""
        mock_get.side_effect = Exception("Connection failed")
        
        result = query_prometheus("http://localhost:9090", "up")
        
        assert result == 0.0


class TestCalculateScore:
    """Tests for score calculation function."""
    
    def test_calculate_score_excellent(self):
        """Test score calculation for excellent value."""
        thresholds = {"excellent": 100, "good": 80, "acceptable": 60}
        result = calculate_score(100, thresholds)
        assert result == 100.0
    
    def test_calculate_score_good(self):
        """Test score calculation for good value."""
        thresholds = {"excellent": 100, "good": 80, "acceptable": 60}
        result = calculate_score(90, thresholds)
        assert 80.0 <= result <= 100.0
    
    def test_calculate_score_acceptable(self):
        """Test score calculation for acceptable value."""
        thresholds = {"excellent": 100, "good": 80, "acceptable": 60}
        result = calculate_score(70, thresholds)
        assert 60.0 <= result <= 80.0


class TestEvaluateHealthScore:
    """Tests for health score evaluation."""
    
    @patch("app.postcheck.query_prometheus")
    def test_evaluate_health_score_perfect(self, mock_query):
        """Test health score with perfect metrics."""
        def mock_query_side_effect(url, query):
            return 0.0  # Perfect metrics
        
        mock_query.side_effect = mock_query_side_effect
        
        result = evaluate_health_score(
            prom_url="http://localhost:9090",
            partner="test-partner",
            endpoint="test-endpoint",
            region="test-region",
            window=300
        )
        
        assert result["health_score"] >= 90.0
        assert "components" in result
        assert "latency" in result["components"]
        assert "error_rate" in result["components"]
        assert "success_ratio" in result["components"]
    
    @patch("app.postcheck.query_prometheus")
    def test_evaluate_health_score_degraded(self, mock_query):
        """Test health score with degraded metrics."""
        def mock_query_side_effect(url, query):
            if "error" in query.lower() or "5.." in query:
                return 5.0  # 5% error rate
            elif "success" in query.lower():
                return 95.0  # 95% success rate
            elif "latency" in query.lower() or "duration" in query.lower():
                return 0.1  # 100ms latency
            return 50.0
        
        mock_query.side_effect = mock_query_side_effect
        
        result = evaluate_health_score(
            prom_url="http://localhost:9090",
            partner="test-partner",
            endpoint="test-endpoint",
            region="test-region",
            window=300
        )
        
        assert result["health_score"] < 100.0


class TestMainApp:
    """Tests for Flask application endpoints."""
    
    def test_health_endpoint(self, client):
        """Test /health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["status"] == "healthy"
    
    def test_ready_endpoint(self, client):
        """Test /ready endpoint."""
        response = client.get("/ready")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["status"] == "ready"
    
    def test_postcheck_missing_fields(self, client):
        """Test /postcheck with missing fields."""
        response = client.post(
            "/postcheck",
            json={"partner": "test"},
            content_type="application/json"
        )
        assert response.status_code == 400
    
    def test_postcheck_no_json(self, client):
        """Test /postcheck without JSON body."""
        response = client.post("/postcheck")
        assert response.status_code == 400


@pytest.fixture
def client():
    """Create test client."""
    from app.main import app
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client
