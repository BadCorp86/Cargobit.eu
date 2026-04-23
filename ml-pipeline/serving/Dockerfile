# =============================================================================
# CargoBit ML Serving Service - Dockerfile
# =============================================================================
# Production-ready Docker image for ML Scoring Service
#
# Build: docker build -t cargobit-ml-serving:latest -f Dockerfile.serving .
# Run:   docker run -p 8080:8080 cargobit-ml-serving:latest
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements-scoring.txt .
RUN pip install --no-cache-dir --user -r requirements-scoring.txt

# -----------------------------------------------------------------------------
# Stage 2: Runtime
# -----------------------------------------------------------------------------
FROM python:3.11-slim as runtime

WORKDIR /app

# Create non-root user
RUN groupadd -r cargobit && useradd -r -g cargobit cargobit

# Copy installed packages from builder
COPY --from=builder /root/.local /home/cargobit/.local
ENV PATH=/home/cargobit/.local/bin:$PATH

# Copy application code
COPY --chown=cargobit:cargobit . .

# Create directories
RUN mkdir -p /app/models /app/logs && \
    chown -R cargobit:cargobit /app

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    MODEL_PATH=/app/models/model.txt \
    CONFIG_PATH=/app/config/scoring-config.yaml \
    HOST=0.0.0.0 \
    PORT=8080 \
    LOG_LEVEL=INFO

# Switch to non-root user
USER cargobit

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the service
CMD ["python", "-m", "uvicorn", "serve:app", "--host", "0.0.0.0", "--port", "8080"]
