from fastapi import APIRouter, Depends
from app.api.deps import get_current_user, require_role
from app.schemas.auth import CurrentUser, UserProfileResponse

router = APIRouter(prefix="/auth", tags=["Authentication & Role Guards"])


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(current_user: CurrentUser = Depends(get_current_user)):
    """
    Returns current authenticated user profile and validated roles.
    """
    return UserProfileResponse(
        user_id=current_user.id,
        email=current_user.email,
        roles=current_user.roles,
        display_name=current_user.user_metadata.get("full_name") or (current_user.email.split("@")[0] if current_user.email else "User"),
        preferred_language=current_user.user_metadata.get("preferred_language", "en"),
    )


@router.get("/admin-only")
async def admin_portal(current_user: CurrentUser = Depends(require_role("admin"))):
    """Guarded endpoint: accessible strictly to users with the 'admin' role."""
    return {
        "status": "success",
        "message": f"Welcome Admin {current_user.email}",
        "access": "granted",
    }


@router.get("/coordinator-only")
async def coordinator_dashboard(current_user: CurrentUser = Depends(require_role("coordinator"))):
    """Guarded endpoint: accessible strictly to SHG Coordinators."""
    return {
        "status": "success",
        "message": f"Welcome Coordinator {current_user.email}",
        "access": "granted",
    }


@router.get("/artisan-only")
async def artisan_space(current_user: CurrentUser = Depends(require_role("artisan"))):
    """Guarded endpoint: accessible strictly to Artisans."""
    return {
        "status": "success",
        "message": f"Welcome Artisan {current_user.email}",
        "access": "granted",
    }


@router.get("/financier-only")
async def financier_console(current_user: CurrentUser = Depends(require_role("financier"))):
    """Guarded endpoint: accessible strictly to Financiers (Micro-factoring / DBT)."""
    return {
        "status": "success",
        "message": f"Welcome Financier {current_user.email}",
        "access": "granted",
    }
