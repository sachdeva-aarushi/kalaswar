from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class OrderCreate(BaseModel):
    product_id: UUID
    customer_reference: str
    quantity: int = Field(default=1, ge=1)
    expected_dispatch_at: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., description="Status: pending, in_production, ready_for_dispatch, delivered, delayed")
    note: Optional[str] = None


class OrderAssignmentCreate(BaseModel):
    order_id: UUID
    artisan_id: UUID
    assigned_by: Optional[str] = "Coordinator"


class OrderAssignmentResponse(BaseModel):
    id: UUID
    order_id: UUID
    artisan_id: UUID
    artisan_name: Optional[str] = None
    assigned_at: str
    assigned_by: str

    model_config = ConfigDict(from_attributes=True)


class OrderEventResponse(BaseModel):
    id: UUID
    order_id: UUID
    event_type: str
    note: Optional[str] = None
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_title: Optional[str] = None
    product_image_url: Optional[str] = None
    customer_reference: str
    quantity: int
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None
    status: str
    expected_dispatch_at: Optional[str] = None
    created_at: str
    assignments: List[OrderAssignmentResponse] = Field(default_factory=list)
    events: List[OrderEventResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class PaginatedOrderResponse(BaseModel):
    items: List[OrderResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
