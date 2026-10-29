# Multi-stage production Dockerfile for Kalaswar FastAPI Backend
FROM python:3.12-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv binary from official Astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy dependency specifications
COPY pyproject.toml requirements.txt* ./

# Build virtual environment with uv
RUN uv venv /opt/venv && \
    . /opt/venv/bin/activate && \
    uv pip install --no-cache -r requirements.txt

# Production runtime stage
FROM python:3.12-slim AS runner

WORKDIR /app

# Create unprivileged application user
RUN groupadd -g 1001 kalaswar && \
    useradd -u 1001 -g kalaswar -s /bin/bash -m kalaswar

# Copy isolated virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Copy application source tree
COPY --chown=kalaswar:kalaswar app ./app
COPY --chown=kalaswar:kalaswar scripts ./scripts

USER kalaswar

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
