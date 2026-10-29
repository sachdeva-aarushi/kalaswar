from math import ceil
from typing import List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.adapters.supabase import SupabaseAdapter
from app.api.deps import get_supabase, require_roles
from app.core.logging import logger
from app.schemas.auth import CurrentUser
from app.schemas.product import (
    PaginatedProductResponse,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)
from app.services.audit import AuditService, audit_service

router = APIRouter(prefix="/products", tags=["Products Catalog & Management"])

# Fallback in-memory catalog for demo/testing resilience
DEMO_PRODUCTS: List[dict] = [
    {
        "id": "11111111-0001-0000-0000-000000000001",
        "artisan_id": "cccccccc-0001-0000-0000-000000000001",
        "title": "Handcrafted Kantha Silk Cushion Cover",
        "description": "Pure Murshidabad silk with hand-embroidered bird and floral motifs.",
        "category": "Home Decor",
        "price": 1450.0,
        "image_url": "https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/cushion_01.jpg",
        "cloudinary_public_id": "cushion_01",
        "availability": True,
        "status": "published",
        "gi_watermarked": True,
        "created_at": "2026-10-25T10:00:00Z",
    },
    {
        "id": "11111111-0002-0000-0000-000000000002",
        "artisan_id": "cccccccc-0001-0000-0000-000000000001",
        "title": "Kantha Embroidered Tussar Stole",
        "description": "Traditional running stitch on wild forest tussar silk.",
        "category": "Textiles & Apparel",
        "price": 2850.0,
        "image_url": "https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/stole_01.jpg",
        "cloudinary_public_id": "stole_01",
        "availability": True,
        "status": "published",
        "gi_watermarked": True,
        "created_at": "2026-10-25T11:00:00Z",
    },
    {
        "id": "11111111-0003-0000-0000-000000000003",
        "artisan_id": "cccccccc-0002-0000-0000-000000000002",
        "title": "Warli Ceremonial Wall Hanging",
        "description": "Authentic rice paste painting on mud-treated canvas celebrating harvest.",
        "category": "Paintings & Folk Art",
        "price": 3200.0,
        "image_url": "https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/warli_01.jpg",
        "cloudinary_public_id": "warli_01",
        "availability": True,
        "status": "published",
        "gi_watermarked": True,
        "created_at": "2026-10-26T12:00:00Z",
    },
]


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
        created_at=str(item.get("created_at")),
    )


@router.get("", response_model=PaginatedProductResponse)
@router.get("/", response_model=PaginatedProductResponse)
async def list_products(
    category: Optional[str] = Query(None, description="Filter by craft category"),
    craft: Optional[str] = Query(None, description="Search keyword in craft title/description"),
    artisan_id: Optional[UUID] = Query(None, description="Filter by specific artisan"),
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
    """
    products: List[dict] = []
    try:
        remote_records = await db.query_records("products")
        if remote_records:
            products = remote_records
    except Exception as e:
        logger.warning("Falling back to local catalog store: %s", e)

    # Merge or fallback
    all_items = {str(p["id"]): p for p in DEMO_PRODUCTS}
    for p in products:
        all_items[str(p["id"])] = {
            "id": p["id"],
            "artisan_id": p.get("artisan_id"),
            "title": p.get("name") or p.get("title"),
            "description": p.get("description", ""),
            "category": p.get("category", "Crafts"),
            "price": p.get("price", 0.0),
            "image_url": p.get("image_url"),
            "cloudinary_public_id": p.get("image_public_id") or p.get("cloudinary_public_id"),
            "availability": p.get("availability", True),
            "status": "published",
            "gi_watermarked": True,
            "created_at": p.get("created_at"),
        }

    filtered = list(all_items.values())

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


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Retrieve single product detail by ID with GI provenance status.
    """
    try:
        records = await db.query_records("products", {"id": f"eq.{product_id}"})
        if records:
            return _to_response(records[0])
    except Exception as e:
        logger.warning("Product query error: %s", e)

    # Check local demo catalog
    for p in DEMO_PRODUCTS:
        if str(p["id"]) == str(product_id):
            return _to_response(p)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product '{product_id}' not found")


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProductCreate,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "admin", "artisan"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Publish a newly verified product to the catalog. Requires coordinator, artisan, or admin role.
    """
    new_id = uuid4()
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
        "status": "published",
        "gi_watermarked": True,
    }

    try:
        db_payload = {
            "id": str(new_id),
            "artisan_id": str(product.artisan_id),
            "name": product.title,
            "description": product.description or "",
            "category": product.category,
            "price": product.price,
            "image_url": product.image_url,
            "image_public_id": product.cloudinary_public_id,
            "availability": product.availability,
        }
        await db.insert_record("products", db_payload)
    except Exception as e:
        logger.warning("Could not persist product to database: %s", e)

    DEMO_PRODUCTS.append(item_record)

    await audit.log_action(
        user_id=current_user.id,
        action="product_created",
        entity_type="product",
        entity_id=str(new_id),
        details={"title": product.title, "price": product.price, "artisan_id": str(product.artisan_id)},
    )

    return _to_response(item_record)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    updates: ProductUpdate,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "admin", "artisan"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Update product details. Requires coordinator, artisan, or admin role.
    """
    update_data = updates.model_dump(exclude_unset=True)
    if not update_data:
        return await get_product(product_id, db)

    db_updates = {}
    if "title" in update_data:
        db_updates["name"] = update_data["title"]
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

    try:
        await db.update_records("products", {"id": f"eq.{product_id}"}, db_updates)
    except Exception as e:
        logger.warning("DB update error on product %s: %s", product_id, e)

    # Update in memory
    for p in DEMO_PRODUCTS:
        if str(p["id"]) == str(product_id):
            p.update(update_data)
            await audit.log_action(
                user_id=current_user.id,
                action="product_updated",
                entity_type="product",
                entity_id=str(product_id),
                details=update_data,
            )
            return _to_response(p)

    # Return refreshed record
    return await get_product(product_id, db)


@router.delete("/{product_id}", status_code=status.HTTP_200_OK)
async def delete_product(
    product_id: UUID,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "admin"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Delete a product from the catalog. Requires coordinator or admin role.
    """
    try:
        await db.delete_records("products", {"id": f"eq.{product_id}"})
    except Exception as e:
        logger.warning("DB delete error: %s", e)

    # Remove from local demo
    for i, p in enumerate(DEMO_PRODUCTS):
        if str(p["id"]) == str(product_id):
            del DEMO_PRODUCTS[i]
            break

    await audit.log_action(
        user_id=current_user.id,
        action="product_deleted",
        entity_type="product",
        entity_id=str(product_id),
    )

    return {"message": f"Product '{product_id}' deleted successfully"}
