# Kalaswar Core Services — Production FastAPI Backend

High-performance, production-style FastAPI service for Kalaswar powering:
- WhatsApp Business Bot & AI Voice pipeline (Whisper / Sarvam Indic Voice)
- Supabase JWT authentication & strict role-based access guards
- Contextual request-ID distributed logging & standard error envelopes
- Immutable action audit logging to `action_audit_logs`
- Digital Product Passports (DPP) & Blockchain provenance
- Automatic OpenAPI schema generation & TypeScript typing pipeline

---

## Directory Architecture

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py                    # Role guards & auth dependencies
│   │   ├── middleware.py              # Request-ID tracking & latency logging
│   │   └── v1/
│   │       ├── router.py              # Aggregated v1 API router
│   │       └── endpoints/             # Endpoint modules (health, auth, audit, products, dpp, voice, whatsapp)
│   ├── core/
│   │   ├── config.py                  # Pydantic Settings (pydantic-settings v2)
│   │   ├── errors.py                  # Standardized error envelopes & handlers
│   │   ├── logging.py                 # Request-ID contextual logger filter
│   │   └── security.py                # Supabase JWT decode, role extraction & testing tokens
│   ├── services/
│   │   └── audit.py                   # AuditService writing to action_audit_logs
│   ├── adapters/
│   │   └── supabase.py                # Asynchronous PostgREST adapter with health check
│   ├── models/
│   │   └── domain.py                  # Domain dataclasses & entities
│   ├── schemas/                       # Pydantic validation & OpenAPI contracts
│   └── main.py                        # FastAPI application assembly, CORS & error handlers
├── scripts/
│   └── generate_client_types.py       # OpenAPI exporter & openapi-typescript code generator
├── tests/
│   ├── conftest.py                    # Pytest fixtures & role authentication token helpers
│   ├── test_health.py                 # Health check & Request-ID tests
│   ├── test_security.py               # Supabase JWT & role guard verification tests
│   ├── test_errors.py                 # Error envelope shape tests
│   └── test_audit.py                  # Audit log recording tests
├── Dockerfile                         # Multi-stage production container image (uv-based)
├── Makefile                           # Development, test, lint, and types automation
├── pyproject.toml                     # uv / PEP 621 project configuration
├── requirements.txt                   # Production & testing dependencies
├── openapi.json                       # Exported OpenAPI 3.1 specification
├── .env.example                       # Documented environment variable template
└── README.md
```

---

## Quickstart

### 1. Install Dependencies
Using `uv`:
```bash
uv pip install -r requirements.txt
```
Or standard `pip`:
```bash
pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in Supabase credentials:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
make dev
# Or directly:
uvicorn app.main:app --reload --port 8000
```
Interactive API Documentation:
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

---

## Testing & Quality Assurance

Run the comprehensive pytest suite:
```bash
make test
# Or:
pytest -v tests/
```

Run code verification and linter:
```bash
make lint
```

---

## TypeScript Client Generation

Exports `openapi.json` and generates strongly-typed TypeScript definitions directly into `web/src/lib/api/schema.d.ts` and `mobile/src/api/schema.d.ts`:
```bash
make types
# Or:
python scripts/generate_client_types.py
```

---

## Container Deployment

```bash
make docker-build
make docker-run
```
