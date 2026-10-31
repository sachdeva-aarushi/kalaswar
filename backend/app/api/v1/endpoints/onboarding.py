from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user, get_supabase, require_role, require_roles
from app.adapters.supabase import SupabaseAdapter
from app.schemas.auth import CurrentUser
from app.schemas.onboarding import (
    ArtisanApprovalRequest,
    ArtisanInviteRequest,
    ArtisanJoinRequest,
    ArtisanRequestItem,
    BuyerOnboardingRequest,
    CustomerAddressRequest,
    ShgClusterSummary,
    ShgRegistrationRequest,
)

router = APIRouter(prefix="/onboarding", tags=["Onboarding & Verification"])

# Seed clusters for fallback or unconfigured environments
DEFAULT_CLUSTERS = [
    {
        "id": "bbbb0001-0000-0000-0000-000000000001",
        "name": "Santiniketan Mahila Hastakala Samiti",
        "state": "West Bengal",
        "district": "Birbhum",
        "srlm_id": "WB-BIR-2024-0012",
        "artisan_count": 18,
    },
    {
        "id": "bbbb0002-0000-0000-0000-000000000002",
        "name": "Madhubani Mahila Vikas Mandal",
        "state": "Bihar",
        "district": "Madhubani",
        "srlm_id": "BR-MDB-2023-0089",
        "artisan_count": 24,
    },
    {
        "id": "bbbb0003-0000-0000-0000-000000000003",
        "name": "Kutch Kala Karigar Sangh",
        "state": "Gujarat",
        "district": "Kutch",
        "srlm_id": "GJ-KUT-2022-0451",
        "artisan_count": 31,
    },
]


@router.get("/shg/clusters", response_model=List[ShgClusterSummary])
async def list_shg_clusters(db: SupabaseAdapter = Depends(get_supabase)):
    """
    Lists available SHG collectives for artisan self-registration join picker.
    Publicly accessible so artisans can select their collective during signup.
    Reads live collectives from database with zero fake demo fallbacks.
    """
    records = await db.query_records("shgs")
    clusters = []
    for r in (records or []):
        clusters.append(
            ShgClusterSummary(
                id=UUID(str(r.get("id"))),
                name=str(r.get("name") or r.get("group_name") or "SHG Collective"),
                state=str(r.get("state") or ""),
                district=str(r.get("district") or ""),
                srlm_id=r.get("srlm_id"),
                artisan_count=int(r.get("artisan_count") or 0),
            )
        )
    return clusters


@router.post("/shg", status_code=status.HTTP_201_CREATED)
async def register_shg_collective(
    payload: ShgRegistrationRequest,
    current_user: CurrentUser = Depends(require_role("coordinator")),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    SHG Coordinator Onboarding:
    Registers collective details (name, state, district, optional SRLM id, contact).
    Completes coordinator onboarding.
    """
    shg_id = str(uuid4())
    shg_record = {
        "id": shg_id,
        "name": payload.group_name,
        "state": payload.state,
        "district": payload.district,
        "block": payload.block,
        "srlm_id": payload.srlm_id,
        "contact": payload.contact,
        "created_by": str(current_user.id),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.upsert_record("shgs", shg_record)

    # Link coordinator to collective in group_memberships
    membership_record = {
        "id": str(uuid4()),
        "user_id": str(current_user.id),
        "shg_id": shg_id,
        "member_role": "coordinator",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.upsert_record("group_memberships", membership_record)

    # Update profile onboarding status
    await db.update_records(
        "profiles",
        {"id": f"eq.{current_user.id}"},
        {"onboarding_status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()},
    )

    return {
        "status": "success",
        "onboarding_status": "completed",
        "shg": shg_record,
    }


@router.post("/artisan/join-request", status_code=status.HTTP_201_CREATED)
async def submit_artisan_join_request(
    payload: ArtisanJoinRequest,
    current_user: CurrentUser = Depends(require_role("artisan")),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Artisan Onboarding:
    Artisan requests to join an SHG collective with craft specialty and contact phone.
    Enters 'pending_approval' status until approved by the SHG coordinator.
    Reuses existing artisan record if present to avoid duplication.
    """
    existing_artisans = await db.query_records("artisans", {"user_id": f"eq.{current_user.id}"})
    if existing_artisans:
        artisan_id = existing_artisans[0]["id"]
    else:
        artisan_id = str(uuid4())

    now_iso = datetime.now(timezone.utc).isoformat()
    artisan_record = {
        "id": str(artisan_id),
        "user_id": str(current_user.id),
        "name": current_user.user_metadata.get("full_name") or current_user.email or "Artisan",
        "shg_id": str(payload.shg_id),
        "craft_specialties": [payload.craft],
        "phone": payload.phone,
        "bio": payload.bio,
        "status": "pending",
        "updated_at": now_iso,
    }
    if not existing_artisans:
        artisan_record["created_at"] = now_iso

    await db.upsert_record("artisans", artisan_record)

    # Update profile onboarding status to pending_approval
    await db.update_records(
        "profiles",
        {"id": f"eq.{current_user.id}"},
        {"onboarding_status": "pending_approval", "updated_at": now_iso},
    )

    return {
        "status": "pending_approval",
        "onboarding_status": "pending_approval",
        "artisan_id": str(artisan_id),
        "shg_id": str(payload.shg_id),
        "message": "Join request submitted. Awaiting approval from SHG Coordinator.",
    }


@router.get("/artisan-requests", response_model=List[ArtisanRequestItem])
async def list_pending_artisan_requests(
    current_user: CurrentUser = Depends(require_role("coordinator")),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    SHG Coordinator:
    Lists pending artisan join requests for the coordinator's collective.
    """
    # 1. Determine coordinator's SHG ID
    memberships = await db.query_records("group_memberships", {"user_id": f"eq.{current_user.id}"})
    coordinator_shg_id = None
    if memberships:
        for m in memberships:
            if m.get("member_role") == "coordinator" or m.get("role") == "coordinator":
                coordinator_shg_id = str(m.get("shg_id"))
                break

    if not coordinator_shg_id:
        # Check shgs created_by
        shgs = await db.query_records("shgs", {"created_by": f"eq.{current_user.id}"})
        if shgs:
            coordinator_shg_id = str(shgs[0].get("id"))

    # Fallback to demo default if none found
    if not coordinator_shg_id:
        coordinator_shg_id = DEFAULT_CLUSTERS[0]["id"]

    # 2. Query artisans for this SHG with status=pending
    artisans = await db.query_records("artisans", {"shg_id": f"eq.{coordinator_shg_id}"})
    pending_items = []
    for a in artisans:
        if a.get("status") == "pending":
            craft_list = a.get("craft_specialties") or []
            craft_name = craft_list[0] if isinstance(craft_list, list) and craft_list else str(craft_list or "Craft")
            pending_items.append(
                ArtisanRequestItem(
                    id=UUID(str(a.get("id"))),
                    artisan_id=UUID(str(a.get("id"))),
                    name=str(a.get("name") or "Artisan"),
                    phone=a.get("phone"),
                    craft=craft_name,
                    status=str(a.get("status") or "pending"),
                    shg_id=UUID(coordinator_shg_id),
                    created_at=str(a.get("created_at") or datetime.now(timezone.utc).isoformat()),
                )
            )

    return pending_items


@router.post("/artisan-requests/{artisan_id}/approve")
async def approve_artisan_request(
    artisan_id: UUID,
    payload: Optional[ArtisanApprovalRequest] = None,
    current_user: CurrentUser = Depends(require_role("coordinator")),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    SHG Coordinator:
    Approves an artisan join request, activating their collective membership and granting product publishing rights.
    """
    # Fetch artisan record
    artisans = await db.query_records("artisans", {"id": f"eq.{artisan_id}"})
    if not artisans:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Artisan request '{artisan_id}' not found")

    artisan = artisans[0]
    artisan_user_id = artisan.get("user_id")

    # Update artisan record
    await db.update_records(
        "artisans",
        {"id": f"eq.{artisan_id}"},
        {"status": "approved", "updated_at": datetime.now(timezone.utc).isoformat()},
    )

    # Insert into group_memberships
    if artisan_user_id:
        await db.upsert_record(
            "group_memberships",
            {
                "id": str(uuid4()),
                "user_id": str(artisan_user_id),
                "shg_id": str(artisan.get("shg_id")),
                "artisan_id": str(artisan_id),
                "member_role": "artisan",
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        # Update user profile onboarding_status to completed
        await db.update_records(
            "profiles",
            {"id": f"eq.{artisan_user_id}"},
            {"onboarding_status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()},
        )

    return {
        "status": "approved",
        "artisan_id": str(artisan_id),
        "message": "Artisan successfully approved and onboarded to collective.",
    }


@router.post("/artisan-requests/{artisan_id}/reject")
async def reject_artisan_request(
    artisan_id: UUID,
    payload: Optional[ArtisanApprovalRequest] = None,
    current_user: CurrentUser = Depends(require_role("coordinator")),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    SHG Coordinator:
    Rejects an artisan join request.
    """
    artisans = await db.query_records("artisans", {"id": f"eq.{artisan_id}"})
    if not artisans:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Artisan request '{artisan_id}' not found")

    artisan = artisans[0]
    artisan_user_id = artisan.get("user_id")

    await db.update_records(
        "artisans",
        {"id": f"eq.{artisan_id}"},
        {"status": "rejected", "rejection_note": payload.note if payload else None},
    )

    if artisan_user_id:
        await db.update_records(
            "profiles",
            {"id": f"eq.{artisan_user_id}"},
            {"onboarding_status": "rejected", "updated_at": datetime.now(timezone.utc).isoformat()},
        )

    return {
        "status": "rejected",
        "artisan_id": str(artisan_id),
        "message": "Artisan join request rejected.",
    }


@router.post("/artisan-invite", status_code=status.HTTP_201_CREATED)
async def invite_artisan_by_phone(
    payload: ArtisanInviteRequest,
    current_user: CurrentUser = Depends(require_role("coordinator")),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    SHG Coordinator:
    Invites an artisan to the collective using their phone number.
    """
    invite_id = str(uuid4())
    record = {
        "id": invite_id,
        "coordinator_id": str(current_user.id),
        "phone": payload.phone,
        "name": payload.name,
        "craft": payload.craft,
        "status": "invited",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.upsert_record("artisan_invites", record)

    return {
        "status": "invited",
        "invite_id": invite_id,
        "phone": payload.phone,
        "message": f"Invitation created for phone {payload.phone}.",
    }


@router.patch("/customer/address")
async def update_customer_address(
    payload: CustomerAddressRequest,
    current_user: CurrentUser = Depends(require_role("customer")),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Customer Onboarding:
    Saves shipping address required at checkout. Completes customer profile.
    """
    address_data = payload.model_dump()
    await db.update_records(
        "profiles",
        {"id": f"eq.{current_user.id}"},
        {
            "display_name": payload.name,
            "onboarding_status": "completed",
            "shipping_address": address_data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return {
        "status": "completed",
        "onboarding_status": "completed",
        "address": address_data,
    }


@router.post("/buyer", status_code=status.HTTP_201_CREATED)
async def complete_buyer_onboarding(
    payload: BuyerOnboardingRequest,
    current_user: CurrentUser = Depends(require_role("buyer")),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    B2B Buyer Onboarding:
    Registers corporate sourcing profile with GSTIN validation and contact details.
    Completes buyer onboarding.
    """
    buyer_id = str(uuid4())
    buyer_record = {
        "id": buyer_id,
        "user_id": str(current_user.id),
        "name": payload.company_name,
        "company_name": payload.company_name,
        "gstin": payload.gstin,
        "contact_person": payload.contact_person,
        "contact_phone": payload.contact_phone,
        "contact_email": payload.contact_email or current_user.email,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.upsert_record("buyers", buyer_record)

    await db.update_records(
        "profiles",
        {"id": f"eq.{current_user.id}"},
        {"onboarding_status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()},
    )

    return {
        "status": "completed",
        "onboarding_status": "completed",
        "buyer_id": buyer_id,
        "buyer": buyer_record,
    }

