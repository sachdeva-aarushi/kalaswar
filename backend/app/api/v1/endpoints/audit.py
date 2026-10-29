from typing import Any, List
from fastapi import APIRouter, Depends, Request
from app.api.deps import get_audit, get_current_user, require_roles
from app.schemas.audit import AuditLogCreate
from app.schemas.auth import CurrentUser
from app.services.audit import AuditService

router = APIRouter(prefix="/audit", tags=["Action Audit Logs"])


@router.post("/logs")
async def create_audit_log(
    req: AuditLogCreate,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    audit: AuditService = Depends(get_audit),
):
    """
    Appends an immutable event entry to action_audit_logs.
    Captures actor, action, entity, user_id, client IP, and request_id.
    """
    ip_addr = request.client.host if request.client else None
    actor_name = current_user.user_metadata.get("full_name") or current_user.email or str(current_user.id)

    logged = await audit.log_action(
        actor=actor_name,
        action=req.action,
        entity=req.entity,
        entity_id=req.entity_id,
        actor_user_id=current_user.id,
        payload=req.payload,
        ip_address=ip_addr,
        request_id=getattr(request.state, "request_id", None),
    )

    return {
        "status": "recorded",
        "entry": logged,
    }


@router.get("/logs")
async def list_audit_logs(
    limit: int = 50,
    current_user: CurrentUser = Depends(require_roles(["admin", "coordinator"])),
    audit: AuditService = Depends(get_audit),
):
    """
    Retrieves recent action_audit_logs.
    Restricted to Platform Admins and SHG Coordinators.
    """
    params = {"select": "*", "order": "created_at.desc", "limit": str(limit)}
    records = await audit.adapter.query_records("action_audit_logs", params=params)
    return {
        "total": len(records),
        "data": records,
    }
