from math import ceil
from typing import List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from app.adapters.llm import get_llm_adapter
from app.adapters.stt import get_stt_adapter
from app.adapters.supabase import SupabaseAdapter
from app.api.deps import get_supabase, require_role, require_roles
from app.core.logging import logger
from app.schemas.auth import CurrentUser
from app.schemas.product import (
    PaginatedProductResponse,
    ProductAiDraftRequest,
    ProductAiDraftResponse,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    ProductValidationRequest,
)
from app.services.audit import AuditService, audit_service
from app.services.fairprice import calculate_fair_price

router = APIRouter(prefix="/products", tags=["Products Catalog & Management"])


def _to_response(item: dict) -> ProductResponse:
    return ProductResponse(
        id=UUID(str(item["id"])),
        artisan_id=UUID(str(item["artisan_id"])),
        title=item.get("title") or item.get("name") or "Handcrafted Item",
        description=item.get("description", ""),
        category=item.get("category", "Crafts"),
        price=float(item.get("price", 0.0)),
        image_url=item.get("image_url"),
        cloudinary_public_id=item.get("cloudinary_public_id") or item.get("image_public_id"),
        availability=bool(item.get("availability", True)),
        status=item.get("status", "published"),
        gi_watermarked=bool(item.get("gi_watermarked", True)),
        rejection_reason=item.get("rejection_reason"),
        created_at=str(item.get("created_at")),
    )


@router.get("", response_model=PaginatedProductResponse)
@router.get("/", response_model=PaginatedProductResponse)
async def list_products(
    category: Optional[str] = Query(None, description="Filter by craft category"),
    craft: Optional[str] = Query(None, description="Search keyword in craft title/description"),
    artisan_id: Optional[UUID] = Query(None, description="Filter by specific artisan"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (published, pending_validation, approved, rejected)"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    availability: Optional[bool] = Query(None, description="Filter by stock availability"),
    search: Optional[str] = Query(None, description="Full text search on title or description"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Public catalog endpoint with category filters, price bounds, full text search, and pagination.
    Queries the live database with zero mock fallbacks.
    """
    records = await db.query_records("products")
    filtered = [dict(r) for r in (records or [])]

    if status_filter:
        filtered = [p for p in filtered if str(p.get("status", "")).lower() == status_filter.lower()]

    if category:
        cat_lower = category.lower()
        filtered = [p for p in filtered if cat_lower in str(p.get("category", "")).lower()]

    if craft:
        craft_lower = craft.lower()
        filtered = [
            p
            for p in filtered
            if craft_lower in str(p.get("title", "")).lower()
            or craft_lower in str(p.get("description", "")).lower()
        ]

    if artisan_id:
        filtered = [p for p in filtered if str(p.get("artisan_id")) == str(artisan_id)]

    if min_price is not None:
        filtered = [p for p in filtered if float(p.get("price", 0)) >= min_price]

    if max_price is not None:
        filtered = [p for p in filtered if float(p.get("price", 0)) <= max_price]

    if availability is not None:
        filtered = [p for p in filtered if bool(p.get("availability", True)) == availability]

    if search:
        s_lower = search.lower()
        filtered = [
            p
            for p in filtered
            if s_lower in str(p.get("title", "")).lower()
            or s_lower in str(p.get("description", "")).lower()
            or s_lower in str(p.get("category", "")).lower()
        ]

    total = len(filtered)
    total_pages = max(1, ceil(total / page_size)) if total > 0 else 1
    start_idx = (page - 1) * page_size
    page_items = filtered[start_idx : start_idx + page_size]

    return PaginatedProductResponse(
        items=[_to_response(item) for item in page_items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/validation-queue", response_model=List[ProductResponse])
async def get_validation_queue(
    current_user: CurrentUser = Depends(require_role("coordinator")),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Listing Validation Queue: Returns items in pending_validation, approved, or rejected status.
    Requires coordinator role.
    """
    records = await db.query_records("products")
    queue_items = [p for p in records if p.get("status") in {"pending_validation", "approved", "rejected"}]
    return [_to_response(item) for item in queue_items]


@router.post("/ai-draft", response_model=ProductAiDraftResponse)
async def generate_product_ai_draft(
    payload: ProductAiDraftRequest,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "artisan"])),
):
    """
    Extracts structured craft attributes and FairPrice suggestion from artisan voice transcript or text.
    Uses LLM adapter for structured extraction and domain FairPrice engine.
    """
    llm = get_llm_adapter()
    extraction = await llm.extract_craft_attributes(payload.description, language=payload.language)

    hours = extraction.estimated_labour_hours or 4.0
    fp = calculate_fair_price(extraction)

    craft_val = extraction.craft or "Traditional Craft"
    title_val = extraction.title or f"Handcrafted {craft_val}"
    category_val = "Textiles & Handlooms"
    desc_lower = payload.description.lower()
    if "warli" in desc_lower or "painting" in desc_lower:
        category_val = "Paintings & Folk Art"
    elif "pottery" in desc_lower or "terracotta" in desc_lower:
        category_val = "Pottery & Terracotta"
    elif "grass" in desc_lower or "sikki" in desc_lower:
        category_val = "Natural Fiber & Grass Crafts"
    elif "wood" in desc_lower or "metal" in desc_lower or "dhokra" in desc_lower:
        category_val = "Wood & Metal Crafts"

    desc_lines = [
        f"Authentic handcrafted {craft_val} made by traditional Indian artisans.",
        f"Materials: {', '.join(extraction.materials) if extraction.materials else 'Authentic natural materials'}.",
    ]
    if extraction.colour:
        desc_lines.append(f"Colour: {extraction.colour}.")
    desc_lines.append(f"Estimated craft making time: {hours:.1f} hours.")

    return ProductAiDraftResponse(
        title=title_val,
        description=" ".join(desc_lines),
        category=category_val,
        craft=craft_val,
        materials=extraction.materials or [],
        colour=extraction.colour,
        suggested_price=round(fp.suggested_price, 2),
        making_hours=hours,
        raw_transcript=payload.description,
        follow_up_question=extraction.follow_up_question,
        is_complete=extraction.is_complete(),
        missing_fields=extraction.missing_fields(),
    )


@router.post("/ai-draft-voice", response_model=ProductAiDraftResponse)
async def generate_product_ai_draft_from_voice(
    file: UploadFile = File(...),
    language: str = Form("hi"),
    current_user: CurrentUser = Depends(require_roles(["coordinator", "artisan"])),
):
    """
    Transcribes artisan voice audio and generates structured craft draft with FairPrice suggestion.
    """
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded audio file is empty.")

    stt = get_stt_adapter()
    transcript = await stt.transcribe(audio_bytes, language=language)

    return await generate_product_ai_draft(
        payload=ProductAiDraftRequest(description=transcript, language=language),
        current_user=current_user,
    )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Retrieve single product detail by ID with GI provenance status.
    """
    records = await db.query_records("products", {"id": f"eq.{product_id}"})
    if records:
        return _to_response(records[0])

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product '{product_id}' not found")


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProductCreate,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "artisan"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Create a new product listing.
    Artisans must be approved before publishing; unapproved artisans receive 403 Forbidden.
    Coordinators create direct 'published' or 'approved' listings.
    """
    is_coordinator = current_user.has_role("coordinator")
    is_artisan = current_user.has_role("artisan")

    # If caller is an artisan (and not coordinator), check approval status
    if is_artisan and not is_coordinator:
        # Check current user token onboarding_status
        if current_user.onboarding_status and current_user.onboarding_status not in ("completed", "approved"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unapproved artisans cannot publish products. Awaiting SHG coordinator approval.",
            )

        # Check DB status in artisans table
        artisan_records = await db.query_records("artisans", {"user_id": f"eq.{current_user.id}"})
        if artisan_records:
            artisan_rec = artisan_records[0]
            if artisan_rec.get("status") not in ("approved", "active"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Unapproved artisans cannot publish products. Awaiting SHG coordinator approval.",
                )

    new_id = uuid4()
    initial_status = "published" if is_coordinator else "pending_validation"

    item_record = {
        "id": str(new_id),
        "artisan_id": str(product.artisan_id),
        "name": product.title,
        "title": product.title,
        "description": product.description or "",
        "category": product.category,
        "price": product.price,
        "image_url": product.image_url,
        "image_public_id": product.cloudinary_public_id,
        "availability": product.availability,
        "status": initial_status,
        "gi_watermarked": True,
        "created_at": "2026-10-30T10:00:00Z",
    }

    await db.insert_record("products", item_record)

    await audit.log_action(
        user_id=current_user.id,
        action="product_created",
        entity_type="product",
        entity_id=str(new_id),
        details={"title": product.title, "price": product.price, "artisan_id": str(product.artisan_id), "status": initial_status},
    )

    return _to_response(item_record)


@router.post("/{product_id}/validate", response_model=ProductResponse)
async def validate_product(
    product_id: UUID,
    payload: ProductValidationRequest,
    current_user: CurrentUser = Depends(require_role("coordinator")),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Flow (1) Listing Validation Queue: Approve or reject an artisan product listing with a mandatory reason on rejection.
    Requires coordinator role.
    """
    if payload.action not in {"approve", "reject"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be 'approve' or 'reject'",
        )

    if payload.action == "reject" and not payload.reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A rejection reason is required when rejecting a listing",
        )

    records = await db.query_records("products", {"id": f"eq.{product_id}"})
    if not records:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product '{product_id}' not found")

    target_status = "approved" if payload.action == "approve" else "rejected"
    updates = {
        "status": target_status,
        "rejection_reason": payload.reason if payload.action == "reject" else None,
    }
    updated = await db.update_records("products", {"id": f"eq.{product_id}"}, updates)
    res_record = updated[0] if updated else records[0]
    res_record.update(updates)

    await audit.log_action(
        user_id=current_user.id,
        action=f"product_{payload.action}d",
        entity_type="product",
        entity_id=str(product_id),
        details={"action": payload.action, "reason": payload.reason, "title": res_record.get("title")},
    )
    return _to_response(res_record)


@router.post("/{product_id}/publish", response_model=ProductResponse)
async def publish_product(
    product_id: UUID,
    current_user: CurrentUser = Depends(require_role("coordinator")),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Flow (1) Listing Validation: Publish an approved product to the live catalog.
    Enforces strict gating: Products in 'pending_validation' or 'rejected' status cannot be published.
    Requires coordinator role.
    """
    records = await db.query_records("products", {"id": f"eq.{product_id}"})
    if not records:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product '{product_id}' not found")

    p = records[0]
    current_status = p.get("status")
    if current_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Publication Gated: Product must be in 'approved' status before publishing. Current status: '{current_status}'.",
        )

    updated = await db.update_records("products", {"id": f"eq.{product_id}"}, {"status": "published"})
    res_record = updated[0] if updated else p
    res_record["status"] = "published"

    await audit.log_action(
        user_id=current_user.id,
        action="product_published",
        entity_type="product",
        entity_id=str(product_id),
        details={"title": res_record.get("title")},
    )
    return _to_response(res_record)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    updates: ProductUpdate,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "artisan"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Update product details. Requires coordinator or artisan role.
    """
    update_data = updates.model_dump(exclude_unset=True)
    if not update_data:
        return await get_product(product_id, db)

    db_updates = {}
    if "title" in update_data:
        db_updates["name"] = update_data["title"]
        db_updates["title"] = update_data["title"]
    if "description" in update_data:
        db_updates["description"] = update_data["description"]
    if "category" in update_data:
        db_updates["category"] = update_data["category"]
    if "price" in update_data:
        db_updates["price"] = update_data["price"]
    if "image_url" in update_data:
        db_updates["image_url"] = update_data["image_url"]
    if "cloudinary_public_id" in update_data:
        db_updates["image_public_id"] = update_data["cloudinary_public_id"]
    if "availability" in update_data:
        db_updates["availability"] = update_data["availability"]

    updated = await db.update_records("products", {"id": f"eq.{product_id}"}, db_updates)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product '{product_id}' not found")

    await audit.log_action(
        user_id=current_user.id,
        action="product_updated",
        entity_type="product",
        entity_id=str(product_id),
        details=update_data,
    )
    return _to_response(updated[0])


@router.delete("/{product_id}", status_code=status.HTTP_200_OK)
async def delete_product(
    product_id: UUID,
    current_user: CurrentUser = Depends(require_role("coordinator")),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Delete a product from the catalog. Requires coordinator role.
    """
    await db.delete_records("products", {"id": f"eq.{product_id}"})

    await audit.log_action(
        user_id=current_user.id,
        action="product_deleted",
        entity_type="product",
        entity_id=str(product_id),
    )

    return {"message": f"Product '{product_id}' deleted successfully"}
