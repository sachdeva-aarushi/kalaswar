from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class AuditLogCreate(BaseModel):
    action: str = Field(..., examples=["product_created"])
    entity: Optional[str] = Field(None, examples=["products"])
    entity_id: Optional[UUID] = Field(None, examples=["dddddddd-0001-0000-0000-000000000001"])
    payload: Optional[Dict[str, Any]] = Field(default_factory=dict, examples=[{"price": 1200}])


class AuditLogResponse(BaseModel):
    id: UUID
    actor: str
    actor_user_id: Optional[UUID] = None
    action: str
    entity: Optional[str] = None
    entity_id: Optional[UUID] = None
    payload: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    request_id: Optional[str] = None
    created_at: datetime
