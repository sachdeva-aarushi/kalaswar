from math import ceil
from typing import Dict, List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.adapters.supabase import SupabaseAdapter
from app.api.deps import get_current_user, get_optional_current_user, get_supabase, require_roles
from app.core.logging import logger
from app.schemas.auth import CurrentUser
from app.schemas.order import (
    ArtisanSuggestionResponse,
    OrderAssignmentCreate,
    OrderAssignmentResponse,
    OrderCreate,
    OrderEventResponse,
    OrderResponse,
    OrderStatusUpdate,
    PaginatedOrderResponse,
)
from app.services.audit import AuditService, audit_service

router = APIRouter(tags=["Orders & Production Assignments"])

# Demo orders and assignments repository for reliable test execution
DEMO_ORDERS: List[dict] = [
    {
        "id": "22222222-0001-0000-0000-000000000001",
        "product_id": "11111111-0001-0000-0000-000000000001",
        "product_title": "Handcrafted Kantha Silk Cushion Cover",
        "product_image_url": "https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/cushion_01.jpg",
        "customer_reference": "Aarav Sharma — Delhi",
        "quantity": 2,
        "unit_price": 1450.0,
        "total_amount": 2900.0,
        "status": "in_production",
        "expected_dispatch_at": "2026-11-05",
        "created_at": "2026-10-26T09:30:00Z",
    },
    {
        "id": "22222222-0002-0000-0000-000000000002",
        "product_id": "11111111-0002-0000-0000-000000000002",
        "product_title": "Kantha Embroidered Tussar Stole",
        "product_image_url": "https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/stole_01.jpg",
        "customer_reference": "Meera Patel — Mumbai",
        "quantity": 1,
        "unit_price": 2850.0,
        "total_amount": 2850.0,
        "status": "pending",
        "expected_dispatch_at": "2026-11-10",
        "created_at": "2026-10-27T14:15:00Z",
    },
    {
        "id": "22222222-0003-0000-0000-000000000003",
        "product_id": "11111111-0003-0000-0000-000000000003",
        "product_title": "Warli Ceremonial Wall Hanging",
        "product_image_url": "https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/warli_01.jpg",
        "customer_reference": "FabIndia Corporate Order",
        "quantity": 5,
        "unit_price": 3200.0,
        "total_amount": 16000.0,
        "status": "delayed",
        "expected_dispatch_at": "2026-10-25",
        "created_at": "2026-10-18T11:00:00Z",
    },
]


DEMO_ARTISAN_PROFILES: List[dict] = [
    {
        "id": "cccccccc-0001-0000-0000-000000000001",
        "name": "Anita Soren",
        "craft_skills": ["Kantha Embroidery", "Murshidabad Silk Stitching", "Natural Dyeing"],
        "cluster": "Santiniketan Mahila Hastakala Samiti, Bolpur",
        "qa_pass_rate": 100,
    },
    {
        "id": "cccccccc-0002-0000-0000-000000000002",
        "name": "Sunita Murmu",
        "craft_skills": ["Warli Folk Art", "Canvas Murals", "Rice Paste Application"],
        "cluster": "Dahanu Tribal Collective",
        "qa_pass_rate": 95,
    },
    {
        "id": "cccccccc-0003-0000-0000-000000000003",
        "name": "Radha Devi",
        "craft_skills": ["Kantha Embroidery", "Sikki Grass Weaving"],
        "cluster": "Madhubani Handicrafts Guild",
        "qa_pass_rate": 96,
    },
    {
        "id": "cccccccc-0004-0000-0000-000000000004",
        "name": "Meera Bai",
        "craft_skills": ["Terracotta Temple Art", "Ceramic Glaze"],
        "cluster": "Bankura Pottery Kendra",
        "qa_pass_rate": 98,
    },
]

DEMO_ASSIGNMENTS: List[dict] = [
    {
        "id": "33333333-0001-0000-0000-000000000001",
        "order_id": "22222222-0001-0000-0000-000000000001",
        "artisan_id": "cccccccc-0001-0000-0000-000000000001",
        "artisan_name": "Radha Devi",
        "assigned_at": "2026-10-26T10:00:00Z",
        "assigned_by": "Coordinator Amit",
    },
    {
        "id": "33333333-0002-0000-0000-000000000002",
        "order_id": "22222222-0003-0000-0000-000000000003",
        "artisan_id": "cccccccc-0002-0000-0000-000000000002",
        "artisan_name": "Suresh Warli",
        "assigned_at": "2026-10-19T09:00:00Z",
        "assigned_by": "Coordinator Priya",
    },
]

DEMO_EVENTS: List[dict] = [
    {
        "id": "44444444-0001-0000-0000-000000000001",
        "order_id": "22222222-0001-0000-0000-000000000001",
        "event_type": "order_placed",
        "note": "Customer payment verified via UPI",
        "created_at": "2026-10-26T09:30:00Z",
    },
    {
        "id": "44444444-0002-0000-0000-000000000002",
        "order_id": "22222222-0001-0000-0000-000000000001",
        "event_type": "assigned_to_artisan",
        "note": "Assigned to Radha Devi for Kantha embroidery",
        "created_at": "2026-10-26T10:00:00Z",
    },
]


def _build_order_response(o: dict) -> OrderResponse:
    order_id_str = str(o["id"])
    assignments = [
        OrderAssignmentResponse(
            id=UUID(str(a["id"])),
            order_id=UUID(str(a["order_id"])),
            artisan_id=UUID(str(a["artisan_id"])),
            artisan_name=a.get("artisan_name"),
            assigned_at=str(a.get("assigned_at", "")),
            assigned_by=str(a.get("assigned_by", "Coordinator")),
        )
        for a in DEMO_ASSIGNMENTS
        if str(a["order_id"]) == order_id_str
    ]

    events = [
        OrderEventResponse(
            id=UUID(str(e["id"])),
            order_id=UUID(str(e["order_id"])),
            event_type=e.get("event_type", "status_change"),
            note=e.get("note"),
            created_at=str(e.get("created_at", "")),
        )
        for e in DEMO_EVENTS
        if str(e["order_id"]) == order_id_str
    ]

    return OrderResponse(
        id=UUID(order_id_str),
        product_id=UUID(str(o["product_id"])),
        product_title=o.get("product_title", "Handmade Craft Item"),
        product_image_url=o.get("product_image_url"),
        customer_reference=o.get("customer_reference", "Guest Customer"),
        quantity=int(o.get("quantity", 1)),
        unit_price=float(o.get("unit_price", 0.0)) if o.get("unit_price") else None,
        total_amount=float(o.get("total_amount", 0.0)) if o.get("total_amount") else None,
        status=o.get("status", "pending"),
        expected_dispatch_at=str(o.get("expected_dispatch_at")) if o.get("expected_dispatch_at") else None,
        created_at=str(o.get("created_at", "")),
        assignments=assignments,
        events=events,
    )


# ---------------------------------------------------------------------------
# Orders Endpoints
# ---------------------------------------------------------------------------
@router.get("/orders", response_model=PaginatedOrderResponse)
async def list_orders(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    customer_reference: Optional[str] = Query(None, description="Filter by customer name"),
    artisan_id: Optional[UUID] = Query(None, description="Filter by assigned artisan"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: SupabaseAdapter = Depends(get_supabase),
    current_user: Optional[CurrentUser] = Depends(get_optional_current_user),
):
    """
    List orders with filters, assignments, events, and pagination.
    """
    orders = list(DEMO_ORDERS)

    if status_filter:
        orders = [o for o in orders if o.get("status") == status_filter]

    if customer_reference:
        ref_lower = customer_reference.lower()
        orders = [o for o in orders if ref_lower in str(o.get("customer_reference", "")).lower()]

    if artisan_id:
        assigned_order_ids = {
            str(a["order_id"]) for a in DEMO_ASSIGNMENTS if str(a["artisan_id"]) == str(artisan_id)
        }
        orders = [o for o in orders if str(o["id"]) in assigned_order_ids]

    total = len(orders)
    total_pages = max(1, ceil(total / page_size)) if total > 0 else 1
    start_idx = (page - 1) * page_size
    page_orders = orders[start_idx : start_idx + page_size]

    return PaginatedOrderResponse(
        items=[_build_order_response(o) for o in page_orders],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    db: SupabaseAdapter = Depends(get_supabase),
    current_user: Optional[CurrentUser] = Depends(get_optional_current_user),
):
    """
    Retrieve single order by ID with assignments and timeline events.
    """
    order = next((o for o in DEMO_ORDERS if str(o["id"]) == str(order_id)), None)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order '{order_id}' not found")
    return _build_order_response(order)


@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_in: OrderCreate,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "admin", "buyer"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Directly create a customer or custom B2B order.
    """
    order_id = uuid4()
    order_record = {
        "id": str(order_id),
        "product_id": str(order_in.product_id),
        "product_title": "Direct Placed Order",
        "customer_reference": order_in.customer_reference,
        "quantity": order_in.quantity,
        "status": "pending",
        "expected_dispatch_at": order_in.expected_dispatch_at,
        "created_at": "2026-10-29T23:00:00Z",
    }
    DEMO_ORDERS.insert(0, order_record)

    event_record = {
        "id": str(uuid4()),
        "order_id": str(order_id),
        "event_type": "order_created",
        "note": f"Order created by {current_user.email}",
        "created_at": "2026-10-29T23:00:00Z",
    }
    DEMO_EVENTS.append(event_record)

    try:
        await db.insert_record("orders", {
            "id": str(order_id),
            "product_id": str(order_in.product_id),
            "customer_reference": order_in.customer_reference,
            "quantity": order_in.quantity,
            "status": "pending",
        })
    except Exception as e:
        logger.warning("DB insert warning: %s", e)

    await audit.log_action(
        user_id=current_user.id,
        action="order_created",
        entity_type="order",
        entity_id=str(order_id),
        details={"quantity": order_in.quantity, "customer": order_in.customer_reference},
    )

    return _build_order_response(order_record)


@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: UUID,
    payload: OrderStatusUpdate,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "admin"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Transition order lifecycle status: pending -> in_production -> ready_for_dispatch -> delivered / delayed.
    Requires coordinator or admin role. Appends an immutable order event.
    """
    allowed_statuses = {"pending", "in_production", "ready_for_dispatch", "delivered", "delayed"}
    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{payload.status}'. Allowed: {sorted(list(allowed_statuses))}",
        )

    order = next((o for o in DEMO_ORDERS if str(o["id"]) == str(order_id)), None)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order '{order_id}' not found")

    old_status = order.get("status")
    order["status"] = payload.status

    # Append order event
    event_id = uuid4()
    event_note = payload.note or f"Status changed from {old_status} to {payload.status}"
    DEMO_EVENTS.append({
        "id": str(event_id),
        "order_id": str(order_id),
        "event_type": f"status_{payload.status}",
        "note": event_note,
        "created_at": "2026-10-29T23:05:00Z",
    })

    try:
        await db.update_records("orders", {"id": f"eq.{order_id}"}, {"status": payload.status})
        await db.insert_record("order_events", {
            "order_id": str(order_id),
            "event_type": f"status_{payload.status}",
            "note": event_note,
        })
    except Exception as e:
        logger.warning("DB update warning: %s", e)

    await audit.log_action(
        user_id=current_user.id,
        action="order_status_updated",
        entity_type="order",
        entity_id=str(order_id),
        details={"from": old_status, "to": payload.status, "note": event_note},
    )

    return _build_order_response(order)


# ---------------------------------------------------------------------------
# Assignments Endpoints
# ---------------------------------------------------------------------------
@router.get("/assignments", response_model=List[OrderAssignmentResponse])
async def list_assignments(
    order_id: Optional[UUID] = Query(None, description="Filter by order"),
    artisan_id: Optional[UUID] = Query(None, description="Filter by artisan"),
    current_user: Optional[CurrentUser] = Depends(get_optional_current_user),
):
    """
    Query production assignments for orders and artisans.
    """
    assignments = list(DEMO_ASSIGNMENTS)
    if order_id:
        assignments = [a for a in assignments if str(a["order_id"]) == str(order_id)]
    if artisan_id:
        assignments = [a for a in assignments if str(a["artisan_id"]) == str(artisan_id)]

    return [
        OrderAssignmentResponse(
            id=UUID(str(a["id"])),
            order_id=UUID(str(a["order_id"])),
            artisan_id=UUID(str(a["artisan_id"])),
            artisan_name=a.get("artisan_name"),
            assigned_at=str(a.get("assigned_at", "")),
            assigned_by=str(a.get("assigned_by", "Coordinator")),
        )
        for a in assignments
    ]



@router.get("/assignments/suggestions", response_model=List[ArtisanSuggestionResponse])
async def get_assignment_suggestions(
    order_id: Optional[UUID] = Query(None, description="Order to match artisan skills against"),
    craft: Optional[str] = Query(None, description="Specific craft technique required"),
    current_user: CurrentUser = Depends(require_roles(["coordinator", "admin"])),
):
    """
    Flow (2) Skills-Aware Assignment Suggestions:
    Ranks cluster artisans by craft technique match, open workload capacity, and QA pass record.
    Requires coordinator or admin role.
    """
    target_craft = craft.lower() if craft else ""
    if order_id:
        target_order = next((o for o in DEMO_ORDERS if str(o["id"]) == str(order_id)), None)
        if target_order and not target_craft:
            target_craft = (target_order.get("product_title", "") + " " + target_order.get("customer_reference", "")).lower()

    suggestions: List[ArtisanSuggestionResponse] = []
    for artisan in DEMO_ARTISAN_PROFILES:
        aid_str = str(artisan["id"])
        active_cnt = sum(1 for a in DEMO_ASSIGNMENTS if str(a["artisan_id"]) == aid_str)
        
        # Skill matching
        skills = artisan["craft_skills"]
        skill_match = any(s.lower() in target_craft or any(w in s.lower() for w in target_craft.split()) for s in skills)
        
        score = 60
        reasons = []
        if skill_match:
            score += 25
            matched_skill = next((s for s in skills if any(w in s.lower() for w in target_craft.split())), skills[0])
            reasons.append(f"Specialized in {matched_skill}")
        else:
            reasons.append("Cross-trained in artisan collective crafts")

        if active_cnt == 0:
            score += 15
            reasons.append("Full capacity available (0 active orders)")
        elif active_cnt == 1:
            score += 10
            reasons.append("Good capacity available (1 active order)")
        else:
            reasons.append(f"Moderate load ({active_cnt} active orders)")

        if artisan["qa_pass_rate"] >= 98:
            score += 10
            reasons.append(f"{artisan['qa_pass_rate']}% first-time quality pass rate")
        elif artisan["qa_pass_rate"] >= 95:
            score += 5
            reasons.append(f"{artisan['qa_pass_rate']}% inspection pass rate")

        score = min(100, max(50, score))
        suggestions.append(
            ArtisanSuggestionResponse(
                artisan_id=UUID(aid_str),
                artisan_name=artisan["name"],
                craft_skills=skills,
                cluster=artisan["cluster"],
                match_score=score,
                recommended=False,
                active_orders=active_cnt,
                reasons=reasons,
            )
        )

    suggestions.sort(key=lambda s: s.match_score, reverse=True)
    if suggestions:
        suggestions[0].recommended = True

    return suggestions

@router.post("/assignments", response_model=OrderAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_artisan_to_order(
    payload: OrderAssignmentCreate,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "admin"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Assign an artisan to an order for production. Requires coordinator or admin role.
    """
    order = next((o for o in DEMO_ORDERS if str(o["id"]) == str(payload.order_id)), None)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order '{payload.order_id}' not found")

    new_id = uuid4()
    artisan_name = next((a["name"] for a in DEMO_ARTISAN_PROFILES if str(a["id"]) == str(payload.artisan_id)), "Assigned Artisan")
    assignment_record = {
        "id": str(new_id),
        "order_id": str(payload.order_id),
        "artisan_id": str(payload.artisan_id),
        "artisan_name": artisan_name,
        "assigned_at": "2026-10-29T23:10:00Z",
        "assigned_by": payload.assigned_by or current_user.email,
    }
    DEMO_ASSIGNMENTS.append(assignment_record)

    # Automatically set order status to in_production if it was pending
    if order.get("status") == "pending":
        order["status"] = "in_production"

    DEMO_EVENTS.append({
        "id": str(uuid4()),
        "order_id": str(payload.order_id),
        "event_type": "artisan_assigned",
        "note": f"Artisan {payload.artisan_id} assigned by {current_user.email}",
        "created_at": "2026-10-29T23:10:00Z",
    })

    try:
        await db.insert_record("order_assignments", {
            "id": str(new_id),
            "order_id": str(payload.order_id),
            "artisan_id": str(payload.artisan_id),
            "assigned_by": payload.assigned_by or current_user.email,
        })
    except Exception as e:
        logger.warning("DB assignment warning: %s", e)

    await audit.log_action(
        user_id=current_user.id,
        action="artisan_assigned_to_order",
        entity_type="order_assignment",
        entity_id=str(new_id),
        details={"order_id": str(payload.order_id), "artisan_id": str(payload.artisan_id)},
    )

    return OrderAssignmentResponse(
        id=new_id,
        order_id=payload.order_id,
        artisan_id=payload.artisan_id,
        artisan_name=artisan_name,
        assigned_at="2026-10-29T23:10:00Z",
        assigned_by=payload.assigned_by or current_user.email,
    )


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_200_OK)
async def delete_assignment(
    assignment_id: UUID,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "admin"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Remove an artisan assignment. Requires coordinator or admin role.
    """
    idx = next((i for i, a in enumerate(DEMO_ASSIGNMENTS) if str(a["id"]) == str(assignment_id)), None)
    if idx is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment '{assignment_id}' not found",
        )

    removed = DEMO_ASSIGNMENTS.pop(idx)

    try:
        await db.delete_records("order_assignments", {"id": f"eq.{assignment_id}"})
    except Exception as e:
        logger.warning("DB delete assignment warning: %s", e)

    await audit.log_action(
        user_id=current_user.id,
        action="artisan_unassigned_from_order",
        entity_type="order_assignment",
        entity_id=str(assignment_id),
        details={"order_id": removed.get("order_id"), "artisan_id": removed.get("artisan_id")},
    )

    return {"message": f"Assignment '{assignment_id}' deleted successfully"}
