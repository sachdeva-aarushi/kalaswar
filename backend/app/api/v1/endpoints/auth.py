from typing import Any, Dict, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.api.deps import get_current_user, require_role, require_roles
from app.schemas.auth import CurrentUser, UserProfileResponse
from app.services.audit import audit_service

router = APIRouter(prefix="/auth", tags=["Authentication & Role Guards"])

# Demo mode persistent flag
DEMO_MODE_STATE: Dict[str, Any] = {
    "enabled": True,
    "instant_dbt": True,
    "simulated_courier": True,
    "mock_whatsapp": True,
}

DEMO_USERS: List[Dict[str, Any]] = [
    {
        "id": "aaaa0001-0000-0000-0000-000000000001",
        "email": "admin@kalaswar.demo",
        "display_name": "Kalaswar Platform Admin",
        "role": "admin",
        "cluster": "Central Federation",
        "status": "active",
        "created_at": "2026-10-01T08:00:00Z",
    },
    {
        "id": "bbbb0001-0000-0000-0000-000000000001",
        "email": "coordinator.sunita@kalaswar.demo",
        "display_name": "Sunita Devi",
        "role": "coordinator",
        "cluster": "Santiniketan Mahila Hastakala Samiti",
        "status": "active",
        "created_at": "2026-10-05T09:30:00Z",
    },
    {
        "id": "cccc0001-0000-0000-0000-000000000001",
        "email": "artisan.anita@kalaswar.demo",
        "display_name": "Anita Soren",
        "role": "artisan",
        "cluster": "Bolpur Kantha Guild",
        "status": "active",
        "created_at": "2026-10-10T11:00:00Z",
    },
    {
        "id": "dddd0001-0000-0000-0000-000000000001",
        "email": "buyer.fabindia@kalaswar.demo",
        "display_name": "FabIndia Sourcing Desk",
        "role": "buyer",
        "cluster": "Institutional Corporate",
        "status": "active",
        "created_at": "2026-10-12T14:20:00Z",
    },
    {
        "id": "eeee0001-0000-0000-0000-000000000001",
        "email": "customer.priya@kalaswar.demo",
        "display_name": "Priya Sharma",
        "role": "customer",
        "cluster": "Direct Retail",
        "status": "active",
        "created_at": "2026-10-15T16:45:00Z",
    },
]


class RoleUpdateRequest(BaseModel):
    role: str = Field(..., description="Role: admin, coordinator, artisan, buyer, customer")


class DemoModeToggleRequest(BaseModel):
    enabled: bool = Field(..., description="Enable or disable sandbox simulation mode")


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


@router.get("/users")
async def list_users(current_user: CurrentUser = Depends(require_role("admin"))):
    """
    Flow (8) Admin Users & Roles: List all platform users and roles.
    Restricted to Platform Admins.
    """
    return DEMO_USERS


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: RoleUpdateRequest,
    current_user: CurrentUser = Depends(require_role("admin")),
):
    """
    Flow (8) Admin Users & Roles: Update a user's platform role.
    Restricted to Platform Admins.
    """
    valid_roles = {"admin", "coordinator", "artisan", "buyer", "customer", "financier"}
    if payload.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{payload.role}'. Must be one of {valid_roles}",
        )

    for u in DEMO_USERS:
        if u["id"] == user_id or u["email"] == user_id:
            old_role = u["role"]
            u["role"] = payload.role
            await audit_service.log_action(
                user_id=current_user.id,
                action="user_role_updated",
                entity_type="user_role",
                entity_id=user_id,
                details={"target_email": u["email"], "old_role": old_role, "new_role": payload.role},
            )
            return {"status": "success", "user": u}

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found")


@router.get("/settings/demo-mode")
async def get_demo_mode_setting():
    """
    Flow (8) Admin: Retrieve demo mode sandbox simulation status.
    """
    return DEMO_MODE_STATE


@router.post("/settings/demo-mode")
async def toggle_demo_mode(
    payload: DemoModeToggleRequest,
    current_user: CurrentUser = Depends(require_role("admin")),
):
    """
    Flow (8) Admin: Toggle demo mode simulation.
    Restricted to Platform Admins.
    """
    DEMO_MODE_STATE["enabled"] = payload.enabled
    await audit_service.log_action(
        user_id=current_user.id,
        action="demo_mode_toggled",
        entity_type="system_settings",
        entity_id="demo_mode",
        details={"enabled": payload.enabled},
    )
    return {"status": "success", "demo_mode": DEMO_MODE_STATE}


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