from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.adapters.supabase import SupabaseAdapter
from app.api.deps import get_current_user, get_supabase, require_roles
from app.core.logging import logger
from app.schemas.auth import CurrentUser
from app.schemas.production import (
    ProductionEventCreate,
    ProductionEventResponse,
    QualityCheckCreate,
    QualityCheckResponse,
    ShipmentCreate,
    ShipmentEventCreate,
    ShipmentEventResponse,
    ShipmentResponse,
)
from app.services.audit import AuditService, audit_service

router = APIRouter(tags=["Production Events, Quality Checks & Logistics"])

# In-memory repositories for resilient demo execution
DEMO_PRODUCTION_EVENTS: List[dict] = [
    {
        "id": "66666666-0001-0000-0000-000000000001",
        "order_id": "22222222-0001-0000-0000-000000000001",
        "plan_id": None,
        "stage": "Pattern cutting & marking",
        "note": "Silk fabric cut according to motif template",
        "recorded_by": "Radha Devi",
        "occurred_at": "2026-10-27T10:00:00Z",
    },
    {
        "id": "66666666-0002-0000-0000-000000000002",
        "order_id": "22222222-0001-0000-0000-000000000001",
        "plan_id": None,
        "stage": "Kantha embroidery stitching",
        "note": "Lotus centre completed with running stitch",
        "recorded_by": "Radha Devi",
        "occurred_at": "2026-10-28T15:30:00Z",
    },
]

DEMO_QUALITY_CHECKS: List[dict] = [
    {
        "id": "77777777-0001-0000-0000-000000000001",
        "order_id": "22222222-0001-0000-0000-000000000001",
        "artisan_id": "cccccccc-0001-0000-0000-000000000001",
        "result": "pass",
        "notes": "Thread tension uniform, motif alignment verified against GI spec.",
        "checked_by": "Coordinator Amit",
        "checked_at": "2026-10-29T11:00:00Z",
    }
]

DEMO_SHIPMENTS: List[dict] = [
    {
        "id": "88888888-0001-0000-0000-000000000001",
        "order_id": "22222222-0001-0000-0000-000000000001",
        "status": "in_transit",
        "carrier": "BlueDart Express",
        "tracking_ref": "BD99482710IN",
        "provider": "BlueDart B2B",
        "created_at": "2026-10-29T14:00:00Z",
    }
]

DEMO_SHIPMENT_EVENTS: List[dict] = [
    {
        "id": "99999999-0001-0000-0000-000000000001",
        "shipment_id": "88888888-0001-0000-0000-000000000001",
        "event_type": "dispatched",
        "note": "Package handed over to BlueDart courier at Bolpur Hub",
        "occurred_at": "2026-10-29T14:30:00Z",
    }
]


# ---------------------------------------------------------------------------
# 1. Production Events
# ---------------------------------------------------------------------------
@router.get("/production-events", response_model=List[ProductionEventResponse])
async def list_production_events(
    order_id: Optional[UUID] = Query(None, description="Filter by order"),
    plan_id: Optional[UUID] = Query(None, description="Filter by production plan"),
    current_user: Optional[CurrentUser] = Depends(get_current_user),
):
    """
    List production milestone events for orders and production plans.
    """
    events = list(DEMO_PRODUCTION_EVENTS)
    if order_id:
        events = [e for e in events if str(e.get("order_id")) == str(order_id)]
    if plan_id:
        events = [e for e in events if str(e.get("plan_id")) == str(plan_id)]

    return [
        ProductionEventResponse(
            id=UUID(str(e["id"])),
            order_id=UUID(str(e["order_id"])) if e.get("order_id") else None,
            plan_id=UUID(str(e["plan_id"])) if e.get("plan_id") else None,
            stage=e["stage"],
            note=e.get("note"),
            recorded_by=e.get("recorded_by"),
            occurred_at=str(e.get("occurred_at", "")),
        )
        for e in events
    ]


@router.post("/production-events", response_model=ProductionEventResponse, status_code=status.HTTP_201_CREATED)
async def create_production_event(
    payload: ProductionEventCreate,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "admin", "artisan"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Record a new production milestone event (cutting, embroidery, finishing).
    """
    new_id = uuid4()
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "id": str(new_id),
        "order_id": str(payload.order_id) if payload.order_id else None,
        "plan_id": str(payload.plan_id) if payload.plan_id else None,
        "stage": payload.stage,
        "note": payload.note,
        "recorded_by": payload.recorded_by or current_user.email,
        "occurred_at": now_iso,
    }
    DEMO_PRODUCTION_EVENTS.append(record)

    await audit.log_action(
        user_id=current_user.id,
        action="production_event_recorded",
        entity_type="production_event",
        entity_id=str(new_id),
        details={"stage": payload.stage, "order_id": str(payload.order_id)},
    )

    return ProductionEventResponse(
        id=new_id,
        order_id=payload.order_id,
        plan_id=payload.plan_id,
        stage=payload.stage,
        note=payload.note,
        recorded_by=payload.recorded_by or current_user.email,
        occurred_at=now_iso,
    )


# ---------------------------------------------------------------------------
# 2. Quality Checks
# ---------------------------------------------------------------------------
@router.get("/quality-checks", response_model=List[QualityCheckResponse])
async def list_quality_checks(
    order_id: Optional[UUID] = Query(None, description="Filter by order"),
    artisan_id: Optional[UUID] = Query(None, description="Filter by artisan"),
    current_user: Optional[CurrentUser] = Depends(get_current_user),
):
    """
    Query quality check inspection records.
    """
    qcs = list(DEMO_QUALITY_CHECKS)
    if order_id:
        qcs = [q for q in qcs if str(q.get("order_id")) == str(order_id)]
    if artisan_id:
        qcs = [q for q in qcs if str(q.get("artisan_id")) == str(artisan_id)]

    return [
        QualityCheckResponse(
            id=UUID(str(q["id"])),
            order_id=UUID(str(q["order_id"])),
            artisan_id=UUID(str(q["artisan_id"])) if q.get("artisan_id") else None,
            result=q["result"],
            notes=q.get("notes"),
            checked_by=q.get("checked_by"),
            checked_at=str(q.get("checked_at", "")),
        )
        for q in qcs
    ]


@router.post("/quality-checks", response_model=QualityCheckResponse, status_code=status.HTTP_201_CREATED)
async def create_quality_check(
    payload: QualityCheckCreate,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "admin"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Record a QA inspection verdict (pass, fail, conditional) for an order. Requires coordinator or admin role.
    """
    valid_results = {"pass", "fail", "conditional"}
    if payload.result not in valid_results:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid QC result '{payload.result}'. Must be one of {valid_results}",
        )

    new_id = uuid4()
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "id": str(new_id),
        "order_id": str(payload.order_id),
        "artisan_id": str(payload.artisan_id) if payload.artisan_id else None,
        "result": payload.result,
        "notes": payload.notes,
        "checked_by": payload.checked_by or current_user.email,
        "checked_at": now_iso,
    }
    DEMO_QUALITY_CHECKS.append(record)

    try:
        await db.insert_record("quality_checks", record)
    except Exception as e:
        logger.warning("DB insert warning: %s", e)

    await audit.log_action(
        user_id=current_user.id,
        action="quality_check_submitted",
        entity_type="quality_check",
        entity_id=str(new_id),
        details={"result": payload.result, "order_id": str(payload.order_id)},
    )

    return QualityCheckResponse(
        id=new_id,
        order_id=payload.order_id,
        artisan_id=payload.artisan_id,
        result=payload.result,
        notes=payload.notes,
        checked_by=payload.checked_by or current_user.email,
        checked_at=now_iso,
    )


# ---------------------------------------------------------------------------
# 3. Shipments & Shipment Events
# ---------------------------------------------------------------------------
@router.get("/shipments", response_model=List[ShipmentResponse])
async def list_shipments(
    order_id: Optional[UUID] = Query(None, description="Filter by order"),
    current_user: Optional[CurrentUser] = Depends(get_current_user),
):
    """
    Query shipments and tracking status.
    """
    shipments = list(DEMO_SHIPMENTS)
    if order_id:
        shipments = [s for s in shipments if str(s.get("order_id")) == str(order_id)]

    res: List[ShipmentResponse] = []
    for s in shipments:
        sid_str = str(s["id"])
        events = [
            ShipmentEventResponse(
                id=UUID(str(e["id"])),
                shipment_id=UUID(str(e["shipment_id"])),
                event_type=e["event_type"],
                note=e.get("note"),
                occurred_at=str(e.get("occurred_at", "")),
            )
            for e in DEMO_SHIPMENT_EVENTS
            if str(e.get("shipment_id")) == sid_str
        ]
        res.append(
            ShipmentResponse(
                id=UUID(sid_str),
                order_id=UUID(str(s["order_id"])),
                status=s.get("status", "preparing"),
                carrier=s.get("carrier"),
                tracking_ref=s.get("tracking_ref"),
                provider=s.get("provider"),
                created_at=str(s.get("created_at", "")),
                events=events,
            )
        )
    return res


@router.post("/shipments", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_shipment(
    payload: ShipmentCreate,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "admin"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Create a shipment dispatch record with carrier and tracking reference.
    """
    new_id = uuid4()
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "id": str(new_id),
        "order_id": str(payload.order_id),
        "carrier": payload.carrier,
        "tracking_ref": payload.tracking_ref,
        "provider": payload.provider,
        "status": payload.status or "preparing",
        "created_at": now_iso,
    }
    DEMO_SHIPMENTS.append(record)

    event_id = uuid4()
    init_event = {
        "id": str(event_id),
        "shipment_id": str(new_id),
        "event_type": "label_created",
        "note": f"Shipment booked with {payload.carrier}. Tracking: {payload.tracking_ref}",
        "occurred_at": now_iso,
    }
    DEMO_SHIPMENT_EVENTS.append(init_event)

    try:
        await db.insert_record("shipments", {
            "id": str(new_id),
            "order_id": str(payload.order_id),
            "carrier": payload.carrier,
            "tracking_ref": payload.tracking_ref,
            "provider": payload.provider,
            "status": payload.status,
        })
    except Exception as e:
        logger.warning("DB insert warning: %s", e)

    await audit.log_action(
        user_id=current_user.id,
        action="shipment_created",
        entity_type="shipment",
        entity_id=str(new_id),
        details={"carrier": payload.carrier, "tracking_ref": payload.tracking_ref},
    )

    return ShipmentResponse(
        id=new_id,
        order_id=payload.order_id,
        status=payload.status or "preparing",
        carrier=payload.carrier,
        tracking_ref=payload.tracking_ref,
        provider=payload.provider,
        created_at=now_iso,
        events=[
            ShipmentEventResponse(
                id=event_id,
                shipment_id=new_id,
                event_type="label_created",
                note=init_event["note"],
                occurred_at=now_iso,
            )
        ],
    )


@router.post("/shipments/{shipment_id}/events", response_model=ShipmentEventResponse, status_code=status.HTTP_201_CREATED)
async def append_shipment_event(
    shipment_id: UUID,
    payload: ShipmentEventCreate,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "admin"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Append an in-transit tracking event to a shipment.
    """
    shipment = next((s for s in DEMO_SHIPMENTS if str(s["id"]) == str(shipment_id)), None)
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Shipment '{shipment_id}' not found")

    new_id = uuid4()
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "id": str(new_id),
        "shipment_id": str(shipment_id),
        "event_type": payload.event_type,
        "note": payload.note,
        "occurred_at": now_iso,
    }
    DEMO_SHIPMENT_EVENTS.append(record)

    # Update shipment status
    if payload.event_type in {"in_transit", "out_for_delivery", "delivered"}:
        shipment["status"] = payload.event_type

    await audit.log_action(
        user_id=current_user.id,
        action="shipment_event_appended",
        entity_type="shipment_event",
        entity_id=str(new_id),
        details={"shipment_id": str(shipment_id), "event_type": payload.event_type},
    )

    return ShipmentEventResponse(
        id=new_id,
        shipment_id=shipment_id,
        event_type=payload.event_type,
        note=payload.note,
        occurred_at=now_iso,
    )
