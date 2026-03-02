# Multi-stage build for AI Security Collector
# Optimized for fast builds and small image size
# SECURITY NOTES:
# - CVE-2026-0861 (glibc): No fix available - affects libc-bin, libc6
# - CVE-2025-7458 (sqlite): Tracked, waiting for Debian security update
# - CVE-2023-45853 (zlib): Marked will_not_fix by vendor

# ============================================
# Stage 1: Build dependencies
# ============================================
FROM python:3.12-slim-bookworm AS builder

WORKDIR /build

# Install build dependencies in single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements (cached if unchanged)
COPY requirements.prod.txt .
RUN pip install --no-cache-dir --prefix=/install \
    --compile \
    --no-warn-script-location \
    -r requirements.prod.txt

# ============================================
# Stage 2: Runtime image
# ============================================
FROM python:3.12-slim-bookworm AS runtime

# Security: Create non-root user and directories
RUN useradd -m -u 1000 -s /bin/sh collector && \
    mkdir -p /data /tmp && \
    chown -R 1000:1000 /data /tmp

WORKDIR /app

# Copy only Python packages (no build tools)
COPY --from=builder /install /usr/local

# Copy application code (optimized layer order)
COPY --chown=1000:1000 collectors/ ./collectors/
COPY --chown=1000:1000 advisors/ ./advisors/
COPY --chown=1000:1000 config.yaml .

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH=/usr/local/bin:$PATH

# Switch to non-root user
USER 1000

# Expose port
EXPOSE 8000

# Optimized health check (simpler, faster)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=2 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=2)" || exit 1

# Run the collector
CMD ["uvicorn", "collectors.falco_collector:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
