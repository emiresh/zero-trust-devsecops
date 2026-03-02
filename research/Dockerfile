# Multi-stage build for AI Security Collector
# Note: Using latest Debian base image. CVE-2026-0861 (glibc) - no fix available yet
FROM python:3.12-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# ============================================
# Final stage
# ============================================
FROM python:3.12-slim-bookworm AS final

# Create non-root user
RUN useradd -m -u 1000 -s /bin/bash collector && \
    mkdir -p /data /tmp && \
    chown -R 1000:1000 /data /tmp

WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /root/.local /home/collector/.local

# Copy application code
COPY collectors/ ./collectors/
COPY config.yaml .

# Set PATH for user-installed packages
ENV PATH=/home/collector/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

# Switch to non-root user
USER 1000

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run the collector
CMD ["python", "-m", "uvicorn", "collectors.falco_collector:app", "--host", "0.0.0.0", "--port", "8000"]
