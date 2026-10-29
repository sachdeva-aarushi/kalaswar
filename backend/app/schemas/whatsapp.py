from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class WhatsAppWebhookEntry(BaseModel):
    id: str
    changes: List[Dict[str, Any]]

class WhatsAppWebhookPayload(BaseModel):
    object: str
    entry: List[WhatsAppWebhookEntry]

class WhatsAppListingDraftRequest(BaseModel):
    artisan_phone: str = Field(..., description="E.164 phone number of the artisan")
    image_media_id: str = Field(..., description="WhatsApp media ID or Cloudinary URL")
    voice_media_id: Optional[str] = Field(None, description="WhatsApp audio media ID")
    transcript: Optional[str] = Field(None, description="Transcribed audio text if already processed")

class WhatsAppListingDraftResponse(BaseModel):
    draft_id: str
    title: str
    craft_type: str
    extracted_materials: List[str]
    suggested_price: float
    status: str = Field("draft", description="draft | published | rejected")
    audio_reply_url: Optional[str] = None
    interactive_buttons: List[str] = ["Approve & Publish", "Edit Details", "Cancel"]
