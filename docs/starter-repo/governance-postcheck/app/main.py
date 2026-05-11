#!/usr/bin/env python3
"""Flask API for governance-postcheck service."""

import os
from flask import Flask, jsonify, request

from postcheck import evaluate_health_score

app = Flask(__name__)

PROM_URL = os.environ.get("PROM_URL", "http://localhost:9090")


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "service": "governance-postcheck"})


@app.route("/ready", methods=["GET"])
def ready():
    """Readiness check endpoint."""
    return jsonify({"status": "ready", "prom_url": PROM_URL})


@app.route("/postcheck", methods=["POST"])
def postcheck():
    """
    Evaluate health score for a canary promotion.
    
    Request body:
    {
        "partner": "p",
        "endpoint": "e",
        "region": "r",
        "required_health": 85,
        "window": 300
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON body provided"}), 400
        
        partner = data.get("partner")
        endpoint = data.get("endpoint")
        region = data.get("region")
        required_health = data.get("required_health", 85)
        window = data.get("window", 300)
        
        if not all([partner, endpoint, region]):
            return jsonify({"error": "Missing required fields: partner, endpoint, region"}), 400
        
        result = evaluate_health_score(
            prom_url=PROM_URL,
            partner=partner,
            endpoint=endpoint,
            region=region,
            window=window
        )
        
        health_score = result["health_score"]
        passed = health_score >= required_health
        
        return jsonify({
            "passed": passed,
            "health_score": health_score,
            "required_health": required_health,
            "components": result["components"],
            "partner": partner,
            "endpoint": endpoint,
            "region": region,
            "window": window
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8443))
    app.run(host="0.0.0.0", port=port)
