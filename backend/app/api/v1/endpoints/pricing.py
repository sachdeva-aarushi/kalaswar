from fastapi import APIRouter
from app.schemas.pricing import (
    FairPriceCalculateRequest,
    FairPriceCalculateResponse,
)
from app.services.fairprice import compute_fair_price

router = APIRouter(prefix="/pricing", tags=["FairPrice Costing Engine"])


@router.post(
    "/calculate",
    response_model=FairPriceCalculateResponse,
    summary="Calculate transparent FairPrice product costing",
)
async def calculate_fair_price_endpoint(payload: FairPriceCalculateRequest):
    """
    FairPrice Engine:
    - Calculates transparent cost build-up: materials + labour + packaging + overhead + wastage + commission + margin.
    - Explicitly distinguishes markup on cost vs margin on selling price.
    - Flags stale material prices against freshness threshold.
    - Enforces labour wage safeguards: labour is never silently free.
    - Computes quote validity expiry date.
    - Returns full breakdown of all cost lines and direct artisan earnings.
    """
    return compute_fair_price(payload)


@router.post(
    "/fairprice/estimate",
    response_model=FairPriceCalculateResponse,
    summary="Alias for FairPrice calculate endpoint",
)
async def estimate_fair_price_alias(payload: FairPriceCalculateRequest):
    """Direct alias for /pricing/calculate for frontends calling /fairprice/estimate."""
    return compute_fair_price(payload)
