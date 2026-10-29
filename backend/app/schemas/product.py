from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    artisan_id: UUID
    title: str
    description: Optional[str] = ""
    category: str = "Crafts"
    price: float = Field(..., ge=0)
    image_url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None
    availability: bool = True


class ProductCreate(ProductBase):
    pass


class ProductResponse(ProductBase):
    id: UUID
    status: str = "published"
    gi_watermarked: bool = False

    model_config = ConfigDict(from_attributes=True)
