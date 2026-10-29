from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class NotificationCreate(BaseModel):
    audience: str = Field(..., description="Target audience: coordinator, artisan, buyer")
    audience_ref: Optional[str] = None
    event_type: str = Field(..., description="Event type: order_update, stock_alert, quality_review, dbt_payout, proposal_action")
    title: str
    body: Optional[str] = None
    link: Optional[str] = None


class NotificationResponse(BaseModel):
    id: UUID
    audience: str
    audience_ref: Optional[str] = None
    event_type: str
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    read_at: Optional[str] = None
    is_read: bool = False
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class NotificationSummaryResponse(BaseModel):
    unread_count: int
    total_count: int
