# =============================================================================
# CargoBit Config Service - Dockerfile
# =============================================================================
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# =============================================================================
# Production Stage
# =============================================================================
FROM python:3.11-slim

WORKDIR /app

# Create non-root user
RUN groupadd -r cargobit && useradd -r -g cargobit cargobit

# Copy wheels from builder
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/*

# Copy application
COPY config_service ./config_service
COPY config ./config

# Create versions directory
RUN mkdir -p /app/config/.versions && chown -R cargobit:cargobit /app

# Switch to non-root
USER cargobit

# Environment
ENV PYTHONUNBUFFERED=1
ENV CONFIG_PATH=/app/config/scoring-config.yaml
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8080/health').raise_for_status()" || exit 1

# Run
CMD ["uvicorn", "config_service.api:app", "--host", "0.0.0.0", "--port", "8080"]
