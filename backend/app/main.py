from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import whatsapp, ai_voice, products, dpp

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    Kalaswar Core Services Backend API
    - WhatsApp Automation Bot Webhooks & Voice Assistant
    - Whisper / Sarvam Indic Voice Pipeline
    - Cloudinary Media GI Watermarking & Asset Optimization
    - Layer-2 Blockchain Provenance & Digital Product Passports (DPP)
    """,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under API v1
app.include_router(whatsapp.router, prefix=settings.API_V1_STR)
app.include_router(ai_voice.router, prefix=settings.API_V1_STR)
app.include_router(products.router, prefix=settings.API_V1_STR)
app.include_router(dpp.router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to Kalaswar Core Services API",
        "docs_url": f"{settings.API_V1_STR}/docs",
        "health": "/health"
    }
