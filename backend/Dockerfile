# =============================================================================
# Medify Backend — Django 4.2 / DRF 3.14 / PostgreSQL
#
# Build from the monorepo root (context = project root):
#   docker build -t medify-backend -f backend/Dockerfile .
#
# Run with a host-mounted volume for persistent data:
#   docker run -d -p 8000:8000 \
#     -v /host/path/data:/app/data \
#     --env-file backend/.env \
#     medify-backend
#
# docker-compose snippet:
#   services:
#     backend:
#       build:
#         context: .
#         dockerfile: backend/Dockerfile
#       volumes:
#         - backend_data:/app/data
#   volumes:
#     backend_data:
# =============================================================================

# ---- Build stage ----
FROM python:3.12-slim AS builder

WORKDIR /build

# Build-time system dependencies (not needed at runtime)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Isolated virtual environment for clean transfer to runtime stage
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# ── Dependency layer (leveraged Docker cache) ──
# Copy root monorepo config files first so they don't bust the layer below
# (these rarely change)
# Copy backend requirements — the most frequently updated dependency file
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch && \
    pip install --no-cache-dir -r requirements.txt

# ---- Runtime stage ----
FROM python:3.12-slim AS runtime

# Create non-root user early
RUN groupadd -r django && useradd -r -g django -d /app -s /sbin/nologin django

# Runtime-only system libraries (OpenMP for torch/FAISS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the virtual environment (complete with all installed packages)
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY . .

# Create persistent data directory
RUN mkdir -p /app/data

# Collect static files (WhiteNoise serves these at runtime)
RUN python manage.py collectstatic --noinput

# Own everything under /app by the non-root user
RUN chown -R django:django /app

# Switch to unprivileged user
USER django

# Persistent volume for uploads, SQLite fallback, logs
#VOLUME ["/app/data"]

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import http.client; c=http.client.HTTPConnection('localhost',8000,timeout=5); c.request('GET','/'); r=c.getresponse(); exit(0) if r.status < 500 else exit(1)"

CMD ["gunicorn", "medify_backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120"]