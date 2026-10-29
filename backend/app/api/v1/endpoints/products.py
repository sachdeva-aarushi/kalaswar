from typing import List
from uuid import UUID, uuid4
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
        gi_watermarked=True,
    )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: UUID):
    """
    Retrieve product details with GI watermark status.
    """
    return ProductResponse(
        id=product_id,
        artisan_id=UUID("cccccccc-0001-0000-0000-000000000001"),
        title="Hand-Stitched Kantha Silk Dupatta",
        description="Pure Murshidabad silk dupatta with lotus and conch motifs.",
        category="Textiles & Apparel",
        price=3450.00,
        image_url="https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/kantha_silk_dupatta_01.jpg",
        availability=True,
        status="published",
        gi_watermarked=True,
    )
