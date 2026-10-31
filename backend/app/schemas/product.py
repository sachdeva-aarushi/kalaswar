from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    artisan_id: UUID
    title: str = Field(..., description="Product title / name")
    description: Optional[str] = ""
    category: str = "Crafts"
    price: float = Field(..., ge=0, description="Price in INR")
    image_url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None
    availability: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    image_url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None
    availability: Optional[bool] = None


class ProductResponse(ProductBase):
    id: UUID
    status: str = "published"
    gi_watermarked: bool = False
    rejection_reason: Optional[str] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProductValidationRequest(BaseModel):
    action: str = Field(..., description="Action: 'approve' or 'reject'")
    reason: Optional[str] = Field(None, description="Mandatory reason if action is 'reject'")


class PaginatedProductResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProductAiDraftRequest(BaseModel):
    description: str = Field(..., min_length=2, description="Text or voice transcript description")
    language: str = Field(default="hi", description="Language code (hi, en, mr, bn, gu)")
    image_url: Optional[str] = None


class ProductAiDraftResponse(BaseModel):
    title: str
    description: str
    category: str
    craft: Optional[str] = None
    materials: List[str] = Field(default_factory=list)
    colour: Optional[str] = None
    suggested_price: float = 0.0
    making_hours: float = 0.0
    raw_transcript: Optional[str] = None
    follow_up_question: Optional[str] = None
    is_complete: bool = True
    missing_fields: List[str] = Field(default_factory=list)
