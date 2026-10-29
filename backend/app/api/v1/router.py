from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    audit,
    products,
    dpp,
    ai_voice,
    whatsapp,
    internal_whatsapp,
    pricing,
    makepossible,
    proposals,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(audit.router)
api_router.include_router(products.router)
api_router.include_router(dpp.router)
api_router.include_router(ai_voice.router)
api_router.include_router(whatsapp.router)
api_router.include_router(internal_whatsapp.router)
api_router.include_router(pricing.router)
api_router.include_router(makepossible.router)
api_router.include_router(proposals.router)


