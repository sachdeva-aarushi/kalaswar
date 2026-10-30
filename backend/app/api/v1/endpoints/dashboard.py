from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from app.adapters.supabase import SupabaseAdapter
from app.api.deps import get_supabase, require_role, require_roles
from app.api.v1.endpoints.inventory import DEMO_MATERIALS, _build_material_response
from app.api.v1.endpoints.orders import DEMO_ASSIGNMENTS, DEMO_EVENTS, DEMO_ORDERS
from app.api.v1.endpoints.production import DEMO_QUALITY_CHECKS
from app.schemas.auth import CurrentUser
from app.schemas.dashboard import (
    CoordinatorDashboardResponse,
    DashboardCounts,
    RecentActivityItem,
    RiskFlag,
)

router = APIRouter(prefix="/dashboard", tags=["Coordinator Dashboard & Risk Analytics"])


@router.get("/coordinator", response_model=CoordinatorDashboardResponse)
async def get_coordinator_dashboard(
    shg_id: Optional[UUID] = Query(None, description="Optional SHG cluster filter"),
    current_user: CurrentUser = Depends(require_role("coordinator")),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Coordinator dashboard aggregates with live operational counts and automated risk flags with explanatory text.
    Identifies production bottlenecks, stale inventory items, and delayed orders.
    """
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    # 1. Orders breakdown
    pending_count = sum(1 for o in DEMO_ORDERS if o.get("status") == "pending")
    in_prod_count = sum(1 for o in DEMO_ORDERS if o.get("status") == "in_production")
    ready_count = sum(1 for o in DEMO_ORDERS if o.get("status") == "ready_for_dispatch")
    delivered_count = sum(1 for o in DEMO_ORDERS if o.get("status") == "delivered")
    delayed_count = sum(1 for o in DEMO_ORDERS if o.get("status") == "delayed")
    active_orders = pending_count + in_prod_count + ready_count

    # 2. Materials & inventory analysis
    mat_responses = [_build_material_response(m, threshold_days=60) for m in DEMO_MATERIALS]
    low_stock_materials = [m for m in mat_responses if m.is_low_stock]
    stale_materials = [m for m in mat_responses if m.is_stale]

    # 3. Quality checks inspection
    passed_qc_order_ids = {str(q["order_id"]) for q in DEMO_QUALITY_CHECKS if q.get("result") == "pass"}
    in_prod_order_ids = {str(o["id"]) for o in DEMO_ORDERS if o.get("status") in {"in_production", "ready_for_dispatch"}}
    pending_qc_ids = in_prod_order_ids - passed_qc_order_ids

    # 4. Artisans counts
    total_artisans = 12
    active_artisans = len({str(a.get("artisan_id")) for a in DEMO_ASSIGNMENTS})

    counts = DashboardCounts(
        active_orders=active_orders,
        pending_production=pending_count,
        in_production=in_prod_count,
        ready_for_dispatch=ready_count,
        delivered_orders=delivered_count,
        delayed_orders=delayed_count,
        total_artisans=total_artisans,
        active_artisans=active_artisans,
        pending_quality_checks=len(pending_qc_ids),
        at_risk_assignments=delayed_count,
        low_stock_materials=len(low_stock_materials),
        stale_inventory_items=len(stale_materials),
    )

    # 5. Risk Flags with explanatory text
    risk_flags: List[RiskFlag] = []

    if delayed_count > 0:
        delayed_orders = [o for o in DEMO_ORDERS if o.get("status") == "delayed"]
        risk_flags.append(
            RiskFlag(
                severity="high",
                type="delayed_orders",
                title=f"{delayed_count} Production Order(s) Delayed Beyond Dispatch Date",
                explanation=(
                    f"{delayed_count} order(s) have passed their estimated completion window without dispatch. "
                    "Artisans should be contacted immediately to resolve material or capacity bottlenecks."
                ),
                affected_ids=[str(o["id"]) for o in delayed_orders],
            )
        )

    if stale_materials:
        risk_flags.append(
            RiskFlag(
                severity="medium",
                type="stale_inventory",
                title=f"{len(stale_materials)} Raw Material Inventory Records Exceed Freshness Policy (>60 days)",
                explanation=(
                    f"{len(stale_materials)} material stock counts have not undergone physical verification in over 60 days. "
                    "MakePossible feasibility engine will mark custom requests using these items as 'uncertain' "
                    "until physical stock verification is recorded."
                ),
                affected_ids=[str(m.id) for m in stale_materials],
            )
        )

    if low_stock_materials:
        risk_flags.append(
            RiskFlag(
                severity="high",
                type="low_stock",
                title=f"{len(low_stock_materials)} Raw Material(s) Dropped Below Reorder Threshold",
                explanation=(
                    f"Items including {', '.join([m.name for m in low_stock_materials[:2]])} have critically low stock. "
                    "Immediate procurement is required to prevent upcoming batch stalls."
                ),
                affected_ids=[str(m.id) for m in low_stock_materials],
            )
        )

    if pending_qc_ids:
        risk_flags.append(
            RiskFlag(
                severity="low",
                type="missing_qa",
                title=f"{len(pending_qc_ids)} Batch(es) in Production Pending Final Quality Check",
                explanation=(
                    f"{len(pending_qc_ids)} batch(es) nearing completion require GI authenticity and motif tension inspection "
                    "by the coordinator before release for courier dispatch."
                ),
                affected_ids=list(pending_qc_ids),
            )
        )

    # 6. Recent activity
    recent_activity: List[RecentActivityItem] = [
        RecentActivityItem(
            id=str(e.get("id")),
            type=str(e.get("event_type", "order_event")),
            title=f"Order Event: {e.get('event_type')}",
            description=e.get("note") or "Order milestone event recorded",
            timestamp=str(e.get("created_at", now_iso)),
        )
        for e in DEMO_EVENTS[-5:]
    ]

    return CoordinatorDashboardResponse(
        shg_id=shg_id or UUID("bbbbbbbb-0001-0000-0000-000000000001"),
        shg_name="Santiniketan Mahila Hastakala Samiti",
        cluster_name="Birbhum Kantha Textile Cluster",
        generated_at=now_iso,
        counts=counts,
        risk_flags=risk_flags,
        recent_activity=recent_activity,
    )
