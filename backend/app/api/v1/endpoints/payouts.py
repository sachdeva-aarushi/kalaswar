from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.adapters.supabase import SupabaseAdapter
from app.api.deps import get_current_user, get_supabase, require_roles
from app.core.logging import logger
from app.schemas.auth import CurrentUser
from app.schemas.payout import (
    PayoutCreate,
    PayoutResponse,
    SimulateDbtRequest,
    SimulateDbtResponse,
)
from app.services.audit import AuditService, audit_service

router = APIRouter(prefix="/payouts", tags=["Artisan Payouts Ledger & Simulated DBT"])

# Demo payout ledger entries (append-only)
DEMO_PAYOUTS: List[dict] = [
    {
        "id": "bbbb2222-0001-0000-0000-000000000001",
        "artisan_id": "cccccccc-0001-0000-0000-000000000001",
        "artisan_name": "Radha Devi",
        "shg_id": "bbbbbbbb-0001-0000-0000-000000000001",
        "order_id": "22222222-0001-0000-0000-000000000001",
        "payout_type": "wage",
        "amount_inr": 1250.0,
        "reference": "DBT-DEMO-PFMS-984210",
        "channel": "dbt",
        "status": "completed",
        "initiated_at": "2026-10-28T16:00:00Z",
        "completed_at": "2026-10-28T16:02:15Z",
        "note": "Direct Benefit Transfer (DBT) wage disbursement — demo mode",
        "is_demo": True,
    }
]


def _build_payout_response(p: dict) -> PayoutResponse:
    return PayoutResponse(
        id=UUID(str(p["id"])),
        artisan_id=UUID(str(p["artisan_id"])) if p.get("artisan_id") else None,
        artisan_name=p.get("artisan_name"),
        shg_id=UUID(str(p["shg_id"])) if p.get("shg_id") else None,
        order_id=UUID(str(p["order_id"])) if p.get("order_id") else None,
        payout_type=p.get("payout_type", "wage"),
        amount_inr=float(p.get("amount_inr", 0.0)),
        reference=p.get("reference"),
        channel=p.get("channel", "dbt"),
        status=p.get("status", "completed"),
        initiated_at=str(p.get("initiated_at", "")),
        completed_at=str(p.get("completed_at")) if p.get("completed_at") else None,
        note=p.get("note"),
        is_demo=bool(p.get("is_demo", True)),
    )


@router.get("", response_model=List[PayoutResponse])
@router.get("/", response_model=List[PayoutResponse])
async def list_payouts(
    artisan_id: Optional[UUID] = Query(None, description="Filter by artisan"),
    shg_id: Optional[UUID] = Query(None, description="Filter by SHG"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    current_user: CurrentUser = Depends(require_roles(["financier", "coordinator", "admin", "artisan"])),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    List immutable wage payout ledger entries.
    Artisans can view their own ledger; financiers, coordinators, and admins view collective records.
    """
    payouts = list(DEMO_PAYOUTS)

    # Artisan role restriction: view only own payouts
    if current_user.has_role("artisan") and not current_user.has_any_role(["financier", "coordinator", "admin"]):
        payouts = [p for p in payouts if str(p.get("artisan_id")) == current_user.id]

    if artisan_id:
        payouts = [p for p in payouts if str(p.get("artisan_id")) == str(artisan_id)]

    if shg_id:
        payouts = [p for p in payouts if str(p.get("shg_id")) == str(shg_id)]

    if status_filter:
        payouts = [p for p in payouts if p.get("status") == status_filter]

    return [_build_payout_response(p) for p in payouts]


@router.post("/simulate-dbt", response_model=SimulateDbtResponse, status_code=status.HTTP_201_CREATED)
async def simulate_dbt_payout(
    payload: SimulateDbtRequest,
    current_user: CurrentUser = Depends(require_roles(["financier", "coordinator", "admin"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Simulate a Direct Benefit Transfer (DBT) wage payout to an artisan bank account/Aadhaar in DEMO mode.
    Creates an immutable row in the payout ledger.
    """
    payout_id = uuid4()
    now_iso = datetime.now(timezone.utc).isoformat()
    dbt_reference = f"DBT-DEMO-PFMS-{uuid4().hex[:10].upper()}"

    payout_record = {
        "id": str(payout_id),
        "artisan_id": str(payload.artisan_id),
        "artisan_name": "Radha Devi",
        "order_id": str(payload.order_id) if payload.order_id else None,
        "payout_type": "wage",
        "amount_inr": payload.amount_inr,
        "reference": dbt_reference,
        "channel": "dbt",
        "status": "completed",
        "initiated_at": now_iso,
        "completed_at": now_iso,
        "note": f"{payload.note} (Account: *{payload.bank_account_last4}, Aadhaar: *{payload.aadhaar_last4})",
        "is_demo": True,
    }
    DEMO_PAYOUTS.insert(0, payout_record)

    try:
        await db.insert_record("payout_ledger", {
            "id": str(payout_id),
            "artisan_id": str(payload.artisan_id),
            "order_id": str(payload.order_id) if payload.order_id else None,
            "payout_type": "wage",
            "amount_inr": payload.amount_inr,
            "reference": dbt_reference,
            "channel": "dbt",
            "status": "completed",
            "initiated_at": now_iso,
            "completed_at": now_iso,
            "note": payout_record["note"],
            "is_demo": True,
        })
    except Exception as e:
        logger.warning("DB payout insert warning: %s", e)

    await audit.log_action(
        user_id=current_user.id,
        action="dbt_payout_simulated",
        entity_type="payout_ledger",
        entity_id=str(payout_id),
        details={
            "artisan_id": str(payload.artisan_id),
            "amount_inr": payload.amount_inr,
            "reference": dbt_reference,
            "is_demo": True,
        },
    )

    return SimulateDbtResponse(
        payout_id=payout_id,
        reference=dbt_reference,
        artisan_id=payload.artisan_id,
        artisan_name=payout_record["artisan_name"],
        amount_inr=payload.amount_inr,
        channel="dbt",
        status="completed",
        pfms_txn_id=dbt_reference,
        initiated_at=now_iso,
        completed_at=now_iso,
        is_demo=True,
        message="Direct Benefit Transfer (DBT) wage payout simulated successfully in DEMO mode.",
    )
