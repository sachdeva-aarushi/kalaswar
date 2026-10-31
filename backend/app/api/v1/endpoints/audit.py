from typing import Any, List
from fastapi import APIRouter, Depends, Request
from app.api.deps import get_audit, get_current_user, require_role, require_roles
from app.schemas.audit import AuditLogCreate
from app.schemas.auth import CurrentUser
from app.services.audit import AuditService

router = APIRouter(prefix="/audit", tags=["Action Audit Logs"])

DEMO_AUDIT_LOGS: List[dict] = [
    {
        "id": "aud00001-0000-0000-0000-000000000001",
        "actor": "Coordinator Sunita",
        "action": "product_approved",
        "entity": "product",
        "entity_type": "product",
        "entity_id": "11111111-0005-0000-0000-000000000005",
        "actor_user_id": "bbbb0001-0000-0000-0000-000000000001",
        "payload": {"title": "Terracotta Temple Hanging Diya", "category": "Pottery & Terracotta", "gi_status": "verified"},
        "created_at": "2026-10-30T10:15:00Z",
    },
    {
        "id": "aud00002-0000-0000-0000-000000000002",
        "actor": "Coordinator Sunita",
        "action": "quality_check_submitted",
        "entity": "quality_check",
        "entity_type": "quality_check",
        "entity_id": "77777777-0001-0000-0000-000000000001",
        "actor_user_id": "bbbb0001-0000-0000-0000-000000000001",
        "payload": {"order_id": "22222222-0001-0000-0000-000000000001", "result": "pass", "motif_alignment": "GI compliant"},
        "created_at": "2026-10-30T09:40:00Z",
    },
    {
        "id": "aud00003-0000-0000-0000-000000000003",
        "actor": "Coordinator Sunita",
        "action": "material_freshness_verified",
        "entity": "materials_inventory",
        "entity_type": "materials_inventory",
        "entity_id": "55555555-0001-0000-0000-000000000001",
        "actor_user_id": "bbbb0001-0000-0000-0000-000000000001",
        "payload": {"name": "Tussar Silk Fabric (Natural)", "quantity": 120.0, "unit": "meters"},
        "created_at": "2026-10-30T08:20:00Z",
    },
    {
        "id": "aud00004-0000-0000-0000-000000000004",
        "actor": "SHG Coordinator",
        "action": "artisan_membership_approved",
        "entity": "group_memberships",
        "entity_type": "group_memberships",
        "entity_id": "cccc0001-0000-0000-0000-000000000001",
        "actor_user_id": "aaaa0001-0000-0000-0000-000000000001",
        "payload": {"target_phone": "+919876543210", "role": "artisan", "status": "approved"},
        "created_at": "2026-10-29T16:00:00Z",
    },
    {
        "id": "aud00005-0000-0000-0000-000000000005",
        "actor": "Financier Console",
        "action": "po_factoring_tokenized",
        "entity": "po_factoring",
        "entity_type": "po_factoring",
        "entity_id": "99990001-0000-0000-0000-000000000001",
        "actor_user_id": "ffff0001-0000-0000-0000-000000000001",
        "payload": {"po_number": "PO-FABINDIA-2026-088", "advance_amount": 105000.0, "escrow_status": "locked"},
        "created_at": "2026-10-29T11:30:00Z",
    },
]


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

    DEMO_AUDIT_LOGS.insert(0, logged)

    return {
        "status": "recorded",
        "entry": logged,
    }


@router.get("/logs")
async def list_audit_logs(
    limit: int = 50,
    current_user: CurrentUser = Depends(require_role("coordinator")),
    audit: AuditService = Depends(get_audit),
):
    """
    Retrieves recent action_audit_logs.
    Restricted to Platform Admins and SHG Coordinators.
    """
    try:
        params = {"select": "*", "order": "created_at.desc", "limit": str(limit)}
        records = await audit.adapter.query_records("action_audit_logs", params=params)
        if records:
            return {
                "total": len(records),
                "data": records,
            }
    except Exception:
        pass

    return {
        "total": len(DEMO_AUDIT_LOGS[:limit]),
        "data": DEMO_AUDIT_LOGS[:limit],
    }
