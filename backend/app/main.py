from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.middleware import RequestIDMiddleware
from app.api.v1.endpoints.health import get_health
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.errors import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.schemas.common import HealthResponse

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    Kalaswar Core Services Backend API
    - Production FastAPI service with Supabase JWT & role-based access control
    - WhatsApp Automation & Indic Voice Pipeline
    - Action audit logging, DPP Provenance, and Cloudinary Media
    """,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Exception Handlers for consistent standard error envelope
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Custom Request-ID Contextual Logging Middleware
app.add_middleware(RequestIDMiddleware)

# Cross-Origin Resource Sharing (CORS) Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 Routes
app.include_router(api_router, prefix=settings.API_V1_STR)


# Top-level Health check endpoint
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def root_health():
    """Top-level health check endpoint for container orchestrators and load balancers."""
    return await get_health()


# Root discovery endpoint
@app.get("/", tags=["Root"])
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs_url": "/docs",
        "openapi_url": "/openapi.json",
        "health": "/health",
        "api_v1": settings.API_V1_STR,
    }
