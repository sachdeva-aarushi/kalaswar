from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class StoryConsentItem(BaseModel):
    consent_type: str = Field(..., description="maker_name, maker_photo, voice_transcript, workshop_photo, cultural_notes, marketing_reuse")
    granted: bool = True


class CraftStoryCreate(BaseModel):
    product_id: Optional[UUID] = None
    artisan_id: Optional[UUID] = None
    shg_id: Optional[UUID] = None
    title: str
    body: str
    language: str = "en"
    source_notes: Optional[str] = None
    original_notes: Optional[str] = None
    ai_assisted: bool = False
    consents: List[StoryConsentItem] = Field(default_factory=list)


class CraftStoryUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = Field(None, description="draft, in_review, published, retired")
    approved_by: Optional[str] = None


class CraftStoryResponse(BaseModel):
    id: UUID
    product_id: Optional[UUID] = None
    artisan_id: Optional[UUID] = None
    artisan_name: Optional[str] = None
    shg_id: Optional[UUID] = None
    title: str
    body: str
    language: str
    status: str
    source_notes: Optional[str] = None
    original_notes: Optional[str] = None
    ai_assisted: bool
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    created_at: str
    updated_at: str
    consents: List[Dict[str, Any]] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
