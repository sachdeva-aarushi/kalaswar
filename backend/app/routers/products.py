from uuid import UUID, uuid4
from typing import List
from fastapi import APIRouter
from app.schemas.product import ProductCreate, ProductResponse

router = APIRouter(prefix="/products", tags=["Product Catalog & Auto-Publishing"])

@router.post("/", response_model=ProductResponse)
async def create_product(product: ProductCreate):
    """
    Publish a newly verified product to the Kalaswar catalog and ONDC adapter.
    """
    return ProductResponse(
        id=uuid4(),
        artisan_id=product.artisan_id,
        title=product.title,
        description=product.description,
        category=product.category,
        price=product.price,
        image_url=product.image_url,
        cloudinary_public_id=product.cloudinary_public_id,
        availability=product.availability,
        status="demo_published",
        gi_watermarked=True
    )

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: UUID):
    """
    Retrieve product details with GI watermark status.
    """
    return ProductResponse(
        id=product_id,
        artisan_id=UUID("22222222-0000-0000-0000-000000000001"),
        title="Kouna Grass Round Sling Bag",
        description="A round hand-woven kouna grass sling with floral-embroidery.",
        category="Baskets & Bags",
        price=1290.00,
        image_url="/__l5e/assets-v1/7e443b28-4be9-4fd9-b947-4aff88db0c9d/image.png",
        availability=True,
        status="demo_published",
        gi_watermarked=True
    )
