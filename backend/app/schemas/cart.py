from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class CartItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(default=1, ge=1)
    customisation: Optional[Dict[str, Any]] = Field(default_factory=dict)


class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=1)


class CartItemResponse(BaseModel):
    id: UUID
    cart_id: UUID
    product_id: UUID
    product_title: Optional[str] = None
    product_image_url: Optional[str] = None
    quantity: int
    unit_price: float
    total_price: float
    currency: str = "INR"
    customisation: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class CartResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    session_id: Optional[str] = None
    status: str = "active"
    currency: str = "INR"
    items: List[CartItemResponse] = Field(default_factory=list)
    subtotal_inr: float = 0.0
    total_items: int = 0

    model_config = ConfigDict(from_attributes=True)


class CheckoutRequest(BaseModel):
    customer_reference: str = Field(..., description="Customer name / identifier")
    shipping_name: Optional[str] = None
    shipping_phone: Optional[str] = None
    shipping_address: Optional[str] = None
    payment_method: str = Field(default="upi_qr", description="Payment method: upi_qr, card, cod")


class CheckoutResponse(BaseModel):
    order_id: UUID
    order_status: str = "pending"
    amount_inr: float
    payment_status: str = "demo_verified"
    payment_reference: str
    payment_method: str = "upi_qr"
    is_demo: bool = True
    customer_reference: str
    message: str = "Payment successfully simulated in demo mode"
