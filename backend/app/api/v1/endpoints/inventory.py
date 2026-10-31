from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.adapters.supabase import SupabaseAdapter
from app.api.deps import get_current_user, get_supabase, require_roles
from app.core.logging import logger
from app.schemas.auth import CurrentUser
from app.schemas.inventory import (
    InventorySummaryResponse,
    MaterialInventoryCreate,
    MaterialInventoryResponse,
    MaterialInventoryUpdate,
)
from app.services.audit import AuditService, audit_service

router = APIRouter(prefix="/inventory", tags=["Inventory & Materials Management"])

# Demo materials repository
DEMO_MATERIALS: List[dict] = [
    {
        "id": "55555555-0001-0000-0000-000000000001",
        "shg_id": "bbbbbbbb-0001-0000-0000-000000000001",
        "shg_name": "Santiniketan Mahila Hastakala Samiti",
        "name": "Tussar Silk Fabric (Natural)",
        "unit": "meters",
        "quantity": 120.0,
        "low_stock_threshold": 30.0,
        "updated_at": "2026-10-25T10:00:00Z",
        "updated_by": "Coordinator Amit",
    },
    {
        "id": "55555555-0002-0000-0000-000000000002",
        "shg_id": "bbbbbbbb-0001-0000-0000-000000000001",
        "shg_name": "Santiniketan Mahila Hastakala Samiti",
        "name": "Cotton Embroidery Threads (Lac dyed)",
        "unit": "skeins",
        "quantity": 15.0,  # Below threshold -> low stock!
        "low_stock_threshold": 25.0,
        "updated_at": "2026-08-15T12:00:00Z",  # Older than 60 days -> stale!
        "updated_by": "Coordinator Amit",
    },
    {
        "id": "55555555-0003-0000-0000-000000000003",
        "shg_id": "bbbbbbbb-0002-0000-0000-000000000002",
        "shg_name": "Dahanu Warli Tribal Collective",
        "name": "Natural Geru Ochre Pigment",
        "unit": "kg",
        "quantity": 40.0,
        "low_stock_threshold": 10.0,
        "updated_at": "2026-10-20T08:00:00Z",
        "updated_by": "Coordinator Priya",
    },
]


def _build_material_response(m: dict, threshold_days: int = 60) -> MaterialInventoryResponse:
    now = datetime.now(timezone.utc)
    updated_str = str(m.get("updated_at", ""))
    is_stale = False
    age_days = 0
    try:
        dt = datetime.fromisoformat(updated_str.replace("Z", "+00:00"))
        age_days = (now - dt).days
        is_stale = age_days > threshold_days
    except Exception:
        is_stale = True

    qty = float(m.get("quantity", 0.0))
    low_thr = float(m["low_stock_threshold"]) if m.get("low_stock_threshold") is not None else None
    is_low = bool(low_thr is not None and qty <= low_thr)

    return MaterialInventoryResponse(
        id=UUID(str(m["id"])),
        shg_id=UUID(str(m["shg_id"])),
        shg_name=m.get("shg_name"),
        name=m.get("name", "Material"),
        unit=m.get("unit", "units"),
        quantity=qty,
        low_stock_threshold=low_thr,
        updated_at=updated_str,
        updated_by=m.get("updated_by"),
        is_low_stock=is_low,
        is_stale=is_stale,
        age_in_days=age_days,
    )


@router.get("/materials", response_model=List[MaterialInventoryResponse])
async def list_materials(
    shg_id: Optional[UUID] = Query(None, description="Filter by SHG collective"),
    low_stock: Optional[bool] = Query(None, description="Filter for low stock only"),
    stale_only: Optional[bool] = Query(None, description="Filter for stale materials only (>60 days unverified)"),
    freshness_threshold_days: int = Query(60, ge=1, description="Threshold in days to flag stale materials"),
    current_user: Optional[CurrentUser] = Depends(get_current_user),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    List raw materials inventory with freshness tracking and low stock indicators.
    """
    materials = list(DEMO_MATERIALS)

    if shg_id:
        materials = [m for m in materials if str(m.get("shg_id")) == str(shg_id)]

    responses = [_build_material_response(m, freshness_threshold_days) for m in materials]

    if low_stock is not None:
        responses = [r for r in responses if r.is_low_stock == low_stock]

    if stale_only is not None and stale_only:
        responses = [r for r in responses if r.is_stale]

    return responses


@router.post("/materials", response_model=MaterialInventoryResponse, status_code=status.HTTP_201_CREATED)
async def create_material(
    payload: MaterialInventoryCreate,
    current_user: CurrentUser = Depends(require_roles(["coordinator"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Add a new raw material record to collective inventory.
    """
    new_id = uuid4()
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "id": str(new_id),
        "shg_id": str(payload.shg_id),
        "name": payload.name,
        "unit": payload.unit,
        "quantity": payload.quantity,
        "low_stock_threshold": payload.low_stock_threshold,
        "updated_at": now_iso,
        "updated_by": payload.updated_by or current_user.email,
    }
    DEMO_MATERIALS.append(record)

    try:
        await db.insert_record("materials_inventory", record)
    except Exception as e:
        logger.warning("DB insert warning: %s", e)

    await audit.log_action(
        user_id=current_user.id,
        action="material_created",
        entity_type="materials_inventory",
        entity_id=str(new_id),
        details={"name": payload.name, "quantity": payload.quantity, "shg_id": str(payload.shg_id)},
    )

    return _build_material_response(record)


@router.patch("/materials/{material_id}", response_model=MaterialInventoryResponse)
async def update_material(
    material_id: UUID,
    payload: MaterialInventoryUpdate,
    current_user: CurrentUser = Depends(require_roles(["coordinator"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Update stock levels or threshold. Refreshes updated_at timestamp to clear stale flag.
    """
    mat = next((m for m in DEMO_MATERIALS if str(m["id"]) == str(material_id)), None)
    if not mat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Material '{material_id}' not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        if v is not None:
            mat[k] = v
    mat["updated_at"] = now_iso
    mat["updated_by"] = payload.updated_by or current_user.email

    try:
        await db.update_records("materials_inventory", {"id": f"eq.{material_id}"}, mat)
    except Exception as e:
        logger.warning("DB update warning: %s", e)

    await audit.log_action(
        user_id=current_user.id,
        action="material_updated",
        entity_type="materials_inventory",
        entity_id=str(material_id),
        details=update_data,
    )

    return _build_material_response(mat)


@router.delete("/materials/{material_id}", status_code=status.HTTP_200_OK)
async def delete_material(
    material_id: UUID,
    current_user: CurrentUser = Depends(require_roles(["coordinator"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Remove a material from inventory.
    """
    idx = next((i for i, m in enumerate(DEMO_MATERIALS) if str(m["id"]) == str(material_id)), None)
    if idx is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Material '{material_id}' not found")

    del DEMO_MATERIALS[idx]

    try:
        await db.delete_records("materials_inventory", {"id": f"eq.{material_id}"})
    except Exception as e:
        logger.warning("DB delete warning: %s", e)

    await audit.log_action(
        user_id=current_user.id,
        action="material_deleted",
        entity_type="materials_inventory",
        entity_id=str(material_id),
    )

    return {"message": f"Material '{material_id}' deleted successfully"}


@router.get("/summary", response_model=InventorySummaryResponse)
async def get_inventory_summary(
    current_user: Optional[CurrentUser] = Depends(get_current_user),
):
    """
    Aggregated inventory metrics across SHGs.
    """
    responses = [_build_material_response(m, 60) for m in DEMO_MATERIALS]
    low_stock = sum(1 for r in responses if r.is_low_stock)
    stale_count = sum(1 for r in responses if r.is_stale)
    unique_shgs = len({str(m.get("shg_id")) for m in DEMO_MATERIALS})

    return InventorySummaryResponse(
        total_materials=len(DEMO_MATERIALS),
        low_stock_count=low_stock,
        stale_materials_count=stale_count,
        total_finished_products=30,  # catalog count
        active_shgs_count=unique_shgs,
    )


@router.post("/materials/{material_id}/verify", response_model=MaterialInventoryResponse)
async def verify_material_freshness(
    material_id: UUID,
    current_user: CurrentUser = Depends(require_roles(["coordinator"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Flow (3) Inventory Freshness Verification:
    Updates material verification timestamp to now, resetting freshness flags.
    Requires coordinator role.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    actor_name = current_user.user_metadata.get("full_name") or current_user.email or "Coordinator"

    for m in DEMO_MATERIALS:
        if str(m["id"]) == str(material_id):
            m["updated_at"] = now_iso
            m["updated_by"] = actor_name
            await audit.log_action(
                user_id=current_user.id,
                action="material_freshness_verified",
                entity_type="materials_inventory",
                entity_id=str(material_id),
                details={"name": m.get("name"), "verified_by": actor_name},
            )
            return _build_material_response(m)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Material '{material_id}' not found")
