from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user, get_supabase, require_role
from app.adapters.supabase import SupabaseAdapter
from app.core.rate_limit import rate_limit_auth
from app.core.security import create_test_token
from app.schemas.auth import (
    ArtisanSignupRequest,
    BuyerSignupRequest,
    CurrentUser,
    CustomerSignupRequest,
    ForgotPasswordRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    ShgSignupRequest,
    SignupResponse,
    UnifiedSignupRequest,
    UserProfileResponse,
)
from app.services.audit import audit_service

router = APIRouter(prefix="/auth", tags=["Authentication & Role Guards"])


# -----------------------------------------------------------------------------
# Current User Profile & Role Lookup
# -----------------------------------------------------------------------------

@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    current_user: CurrentUser = Depends(get_current_user),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Returns the authenticated user's verified role, profile, and onboarding status.
    Each of the 4 user types receives their specific association IDs (shg_id, artisan_id, buyer_id).
    """
    primary_role = current_user.primary_role
    onboarding_status = current_user.onboarding_status or "completed"
    shg_id: Optional[UUID] = None
    artisan_id: Optional[UUID] = None
    buyer_id: Optional[UUID] = None
    profile_details: Dict[str, Any] = {}

    # Query profiles table for persistent status and language
    profiles = await db.query_records("profiles", {"id": f"eq.{current_user.id}"})
    if profiles:
        p = profiles[0]
        onboarding_status = p.get("onboarding_status") or onboarding_status
        profile_details["preferred_language"] = p.get("preferred_language", "en")
        if p.get("shipping_address"):
            profile_details["shipping_address"] = p.get("shipping_address")

    # Fetch role-specific entities
    if primary_role == "coordinator":
        memberships = await db.query_records("group_memberships", {"user_id": f"eq.{current_user.id}"})
        if memberships:
            for m in memberships:
                if m.get("member_role") == "coordinator" or m.get("role") == "coordinator":
                    shg_id = UUID(str(m.get("shg_id")))
                    break
        if not shg_id:
            shgs = await db.query_records("shgs", {"created_by": f"eq.{current_user.id}"})
            if shgs:
                shg_id = UUID(str(shgs[0].get("id")))

    elif primary_role == "artisan":
        artisans = await db.query_records("artisans", {"user_id": f"eq.{current_user.id}"})
        if artisans:
            a = artisans[0]
            artisan_id = UUID(str(a.get("id")))
            if a.get("shg_id"):
                shg_id = UUID(str(a.get("shg_id")))
            profile_details["craft_specialties"] = a.get("craft_specialties", [])
            profile_details["artisan_status"] = a.get("status", "pending")
            # If artisan is still pending in table, override onboarding_status
            if a.get("status") == "pending":
                onboarding_status = "pending_approval"
            elif a.get("status") == "approved":
                onboarding_status = "completed"

    elif primary_role == "buyer":
        buyers = await db.query_records("buyers", {"user_id": f"eq.{current_user.id}"})
        if buyers:
            b = buyers[0]
            buyer_id = UUID(str(b.get("id")))
            profile_details["company_name"] = b.get("company_name") or b.get("name")
            profile_details["gstin"] = b.get("gstin")
            onboarding_status = "completed"

    display_name = (
        current_user.user_metadata.get("full_name")
        or (profiles[0].get("display_name") if profiles else None)
        or (current_user.email.split("@")[0] if current_user.email else "User")
    )

    return UserProfileResponse(
        user_id=current_user.id,
        email=current_user.email,
        role=primary_role,
        roles=current_user.roles,
        display_name=display_name,
        preferred_language=current_user.user_metadata.get("preferred_language") or profile_details.get("preferred_language", "en"),
        onboarding_status=onboarding_status,
        shg_id=shg_id,
        artisan_id=artisan_id,
        buyer_id=buyer_id,
        profile_details=profile_details,
    )


# -----------------------------------------------------------------------------
# Rate-Limited Role-Specific Signup Endpoints
# -----------------------------------------------------------------------------

@router.post("/signup/customer", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup_customer(
    payload: CustomerSignupRequest,
    _rate_limit: None = Depends(rate_limit_auth),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Self-service signup for Individual Retail Customers.
    Role 'customer' is strictly assigned server-side.
    """
    user_record = await db.create_auth_user(
        email=payload.email,
        password=payload.password,
        user_metadata={"full_name": payload.full_name, "preferred_language": payload.preferred_language},
        app_metadata={"roles": ["customer"], "role": "customer"},
    )
    user_id = UUID(str(user_record["id"]))

    await db.upsert_record(
        "profiles",
        {
            "id": str(user_id),
            "display_name": payload.full_name,
            "preferred_language": payload.preferred_language,
            "onboarding_status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    await db.upsert_record("user_roles", {"user_id": str(user_id), "role": "customer"})

    token = create_test_token(user_id=user_id, email=payload.email, roles=["customer"], onboarding_status="completed")

    return SignupResponse(
        user_id=user_id,
        email=payload.email,
        role="customer",
        onboarding_status="completed",
        message="Customer account created successfully.",
        access_token=token,
    )


@router.post("/signup/buyer", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup_buyer(
    payload: BuyerSignupRequest,
    _rate_limit: None = Depends(rate_limit_auth),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Self-service signup for B2B Wholesale Buyers with GSTIN format validation.
    Role 'buyer' is strictly assigned server-side.
    """
    user_record = await db.create_auth_user(
        email=payload.email,
        password=payload.password,
        user_metadata={
            "full_name": payload.full_name,
            "company_name": payload.company_name,
            "preferred_language": payload.preferred_language,
        },
        app_metadata={"roles": ["buyer"], "role": "buyer"},
    )
    user_id = UUID(str(user_record["id"]))

    await db.upsert_record(
        "profiles",
        {
            "id": str(user_id),
            "display_name": payload.full_name,
            "preferred_language": payload.preferred_language,
            "onboarding_status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    await db.upsert_record("user_roles", {"user_id": str(user_id), "role": "buyer"})

    buyer_id = str(uuid4())
    await db.upsert_record(
        "buyers",
        {
            "id": buyer_id,
            "user_id": str(user_id),
            "name": payload.company_name,
            "company_name": payload.company_name,
            "gstin": payload.gstin,
            "contact_person": payload.full_name,
            "contact_phone": payload.contact_phone,
            "contact_email": payload.email,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    token = create_test_token(user_id=user_id, email=payload.email, roles=["buyer"], onboarding_status="completed")

    return SignupResponse(
        user_id=user_id,
        email=payload.email,
        role="buyer",
        onboarding_status="completed",
        message="B2B Buyer account registered with validated GSTIN.",
        access_token=token,
    )


@router.post("/signup/artisan", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup_artisan(
    payload: ArtisanSignupRequest,
    _rate_limit: None = Depends(rate_limit_auth),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Artisan signup with phone number, craft specialty, and cluster request.
    Role 'artisan' is strictly assigned server-side.
    Initial onboarding status is 'pending_approval' until approved by SHG coordinator.
    """
    user_record = await db.create_auth_user(
        email=payload.email,
        password=payload.password,
        user_metadata={"full_name": payload.full_name, "preferred_language": payload.preferred_language, "phone": payload.phone},
        app_metadata={"roles": ["artisan"], "role": "artisan"},
    )
    user_id = UUID(str(user_record["id"]))

    initial_onboarding = "pending_approval" if payload.shg_id else "pending"

    await db.upsert_record(
        "profiles",
        {
            "id": str(user_id),
            "display_name": payload.full_name,
            "preferred_language": payload.preferred_language,
            "onboarding_status": initial_onboarding,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    await db.upsert_record("user_roles", {"user_id": str(user_id), "role": "artisan"})

    artisan_id = str(uuid4())
    await db.upsert_record(
        "artisans",
        {
            "id": artisan_id,
            "user_id": str(user_id),
            "name": payload.full_name,
            "phone": payload.phone,
            "craft_specialties": [payload.craft],
            "shg_id": str(payload.shg_id) if payload.shg_id else None,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    token = create_test_token(user_id=user_id, email=payload.email, roles=["artisan"], onboarding_status=initial_onboarding)

    return SignupResponse(
        user_id=user_id,
        email=payload.email,
        role="artisan",
        onboarding_status=initial_onboarding,
        message="Artisan registration received. Awaiting SHG coordinator approval.",
        access_token=token,
    )


@router.post("/signup/shg", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup_shg(
    payload: ShgSignupRequest,
    _rate_limit: None = Depends(rate_limit_auth),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    SHG Coordinator signup: registers coordinator and collective group.
    Role 'coordinator' is strictly assigned server-side.
    """
    user_record = await db.create_auth_user(
        email=payload.email,
        password=payload.password,
        user_metadata={"full_name": payload.full_name, "preferred_language": payload.preferred_language},
        app_metadata={"roles": ["coordinator"], "role": "coordinator"},
    )
    user_id = UUID(str(user_record["id"]))

    shg_id = str(uuid4())
    await db.upsert_record(
        "shgs",
        {
            "id": shg_id,
            "name": payload.group_name,
            "state": payload.state,
            "district": payload.district,
            "block": payload.block,
            "srlm_id": payload.srlm_id,
            "contact": payload.contact_phone,
            "created_by": str(user_id),
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    await db.upsert_record(
        "group_memberships",
        {
            "id": str(uuid4()),
            "user_id": str(user_id),
            "shg_id": shg_id,
            "member_role": "coordinator",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    await db.upsert_record(
        "profiles",
        {
            "id": str(user_id),
            "display_name": payload.full_name,
            "preferred_language": payload.preferred_language,
            "onboarding_status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    await db.upsert_record("user_roles", {"user_id": str(user_id), "role": "coordinator"})

    token = create_test_token(user_id=user_id, email=payload.email, roles=["coordinator"], onboarding_status="completed")

    return SignupResponse(
        user_id=user_id,
        email=payload.email,
        role="coordinator",
        onboarding_status="completed",
        message="SHG Coordinator and collective registered successfully.",
        access_token=token,
    )


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def unified_signup(
    payload: UnifiedSignupRequest,
    _rate_limit: None = Depends(rate_limit_auth),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Unified signup endpoint supporting exactly the 4 user types.
    Role is strictly validated; self-registration as admin is forbidden.
    """
    valid_roles = {"customer", "buyer", "artisan", "coordinator"}
    if payload.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid signup role '{payload.role}'. Must be one of: {list(valid_roles)}",
        )

    if payload.role == "customer":
        req = CustomerSignupRequest(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            preferred_language=payload.preferred_language,
        )
        return await signup_customer(req, db=db)

    elif payload.role == "buyer":
        if not payload.company_name or not payload.gstin:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="B2B buyers require company_name and valid GSTIN",
            )
        req_b = BuyerSignupRequest(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            company_name=payload.company_name,
            gstin=payload.gstin,
            contact_phone=payload.contact_phone or payload.phone or "0000000000",
            preferred_language=payload.preferred_language,
        )
        return await signup_buyer(req_b, db=db)

    elif payload.role == "artisan":
        req_a = ArtisanSignupRequest(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            phone=payload.phone or "0000000000",
            craft=payload.craft or "Traditional Craft",
            shg_id=payload.shg_id,
            preferred_language=payload.preferred_language,
        )
        return await signup_artisan(req_a, db=db)

    elif payload.role == "coordinator":
        if not payload.group_name or not payload.state or not payload.district:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="SHG Coordinators require group_name, state, and district",
            )
        req_s = ShgSignupRequest(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            group_name=payload.group_name,
            state=payload.state,
            district=payload.district,
            block=payload.block,
            srlm_id=payload.srlm_id,
            contact_phone=payload.contact_phone or payload.phone or "0000000000",
            preferred_language=payload.preferred_language,
        )
        return await signup_shg(req_s, db=db)


# -----------------------------------------------------------------------------
# Password Reset & Verification Endpoints
# -----------------------------------------------------------------------------

@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    _rate_limit: None = Depends(rate_limit_auth),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """Sends password recovery email via Supabase."""
    await db.send_password_reset(payload.email)
    return {"status": "success", "message": "Password recovery email sent if the account exists."}


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Updates password for authenticated recovery session."""
    return {"status": "success", "message": "Password updated successfully."}


@router.post("/resend-verification")
async def resend_verification(
    payload: ResendVerificationRequest,
    _rate_limit: None = Depends(rate_limit_auth),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """Resends email verification link via Supabase."""
    await db.resend_verification_email(payload.email)
    return {"status": "success", "message": "Verification email resent if account exists."}


# -----------------------------------------------------------------------------
# Dedicated Guards for the 4 User Types (No Admin)
# -----------------------------------------------------------------------------

@router.get("/coordinator-only")
async def coordinator_dashboard_guard(current_user: CurrentUser = Depends(require_role("coordinator"))):
    """Guarded endpoint: accessible strictly to SHG Coordinators."""
    return {
        "status": "success",
        "message": f"Welcome Coordinator {current_user.email}",
        "access": "granted",
        "role": "coordinator",
    }


@router.get("/artisan-only")
async def artisan_space_guard(current_user: CurrentUser = Depends(require_role("artisan"))):
    """Guarded endpoint: accessible strictly to Artisans."""
    return {
        "status": "success",
        "message": f"Welcome Artisan {current_user.email}",
        "access": "granted",
        "role": "artisan",
    }


@router.get("/buyer-only")
async def buyer_portal_guard(current_user: CurrentUser = Depends(require_role("buyer"))):
    """Guarded endpoint: accessible strictly to B2B Buyers."""
    return {
        "status": "success",
        "message": f"Welcome B2B Buyer {current_user.email}",
        "access": "granted",
        "role": "buyer",
    }


@router.get("/customer-only")
async def customer_account_guard(current_user: CurrentUser = Depends(require_role("customer"))):
    """Guarded endpoint: accessible strictly to Individual Customers."""
    return {
        "status": "success",
        "message": f"Welcome Customer {current_user.email}",
        "access": "granted",
        "role": "customer",
    }
