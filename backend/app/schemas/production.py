from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ProductionEventCreate(BaseModel):
    order_id: Optional[UUID] = None
    plan_id: Optional[UUID] = None
    stage: str = Field(..., description="Production milestone stage (e.g. cutting, embroidery, finishing)")
    note: Optional[str] = None
    recorded_by: Optional[str] = "Coordinator"


class ProductionEventResponse(BaseModel):
    id: UUID
    plan_id: Optional[UUID] = None
    order_id: Optional[UUID] = None
    stage: str
    note: Optional[str] = None
    recorded_by: Optional[str] = None
    occurred_at: str

    model_config = ConfigDict(from_attributes=True)


class QualityCheckCreate(BaseModel):
    order_id: UUID
    artisan_id: Optional[UUID] = None
    result: str = Field(..., description="Result: pass, fail, conditional")
    notes: Optional[str] = None
    checked_by: Optional[str] = "Coordinator"


class QualityCheckResponse(BaseModel):
    id: UUID
    order_id: UUID
    artisan_id: Optional[UUID] = None
    result: str
    notes: Optional[str] = None
    checked_by: Optional[str] = None
    checked_at: str

    model_config = ConfigDict(from_attributes=True)


class ShipmentEventCreate(BaseModel):
    event_type: str = Field(..., description="Event type: dispatched, in_transit, out_for_delivery, delivered, delayed")
    note: Optional[str] = None


class ShipmentEventResponse(BaseModel):
    id: UUID
    shipment_id: UUID
    event_type: str
    note: Optional[str] = None
    occurred_at: str

    model_config = ConfigDict(from_attributes=True)


class ShipmentCreate(BaseModel):
    order_id: UUID
    carrier: str
    tracking_ref: str
    provider: Optional[str] = "Standard Logistics"
    status: str = "preparing"


class ShipmentResponse(BaseModel):
    id: UUID
    order_id: UUID
    status: str
    carrier: Optional[str] = None
    tracking_ref: Optional[str] = None
    provider: Optional[str] = None
    created_at: str
    events: List[ShipmentEventResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
