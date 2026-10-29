import time
from fastapi import APIRouter
from app.adapters.supabase import supabase_adapter
from app.core.config import settings
from app.schemas.common import HealthResponse

router = APIRouter(tags=["Health"])

START_TIME = time.time()


@router.get("/health", response_model=HealthResponse)
async def get_health():
    """
    Health check endpoint reporting service status, version, uptime, and remote DB reachability.
    """
    db_ok = await supabase_adapter.check_health()
    return HealthResponse(
        status="healthy",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database_connected=db_ok,
    )
