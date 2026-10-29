from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class InteractiveButton(BaseModel):
    id: str = Field(..., examples=["btn_approve"])
    title: str = Field(..., examples=["मंजूर करें / Approve & Publish"])


class CraftExtractionResult(BaseModel):
    title: Optional[str] = Field(None, examples=["हाथ से कढ़ाई किया गया सूती कुशन कवर"])
    craft: Optional[str] = Field(None, examples=["Aari Hand Embroidery"])
    materials: List[str] = Field(default_factory=list, examples=[["Cotton fabric", "Silk thread"]])
    colour: Optional[str] = Field(None, examples=["लाल (Red)", "नीला (Blue)"])
    language: str = Field("hi", examples=["hi"])
    estimated_labour_hours: Optional[float] = Field(None, examples=[4.0])
    confidence: float = Field(1.0, examples=[0.95])

    def is_complete(self) -> bool:
        """Returns True only when all mandatory product fields are present."""
        return bool(self.title and self.craft and self.materials and len(self.materials) > 0)

    def missing_fields(self) -> List[str]:
        missing = []
        if not self.title:
            missing.append("title")
        if not self.craft:
            missing.append("craft")
        if not self.materials or len(self.materials) == 0:
            missing.append("materials")
        return missing


class FairPriceEstimate(BaseModel):
    material_cost: float = Field(..., examples=[280.0])
    labour_cost: float = Field(..., examples=[600.0])
    packaging_cost: float = Field(..., examples=[40.0])
    overhead_cost: float = Field(..., examples=[88.0])
    platform_fee: float = Field(..., examples=[70.0])
    floor_price: float = Field(..., examples=[1008.0])
    suggested_price: float = Field(..., examples=[1099.0])
    artisan_earnings: float = Field(..., examples=[691.0])
    currency: str = Field("INR", examples=["INR"])
    is_complete: bool = Field(True, examples=[True])
    breakdown_notes: List[str] = Field(default_factory=list)


# --- Endpoint Payloads ---

class MediaUploadRequest(BaseModel):
    phone: str = Field(..., description="Artisan E.164 phone number (e.g. +919876543210)")
    media_url: Optional[str] = Field(None, description="Direct URL to WhatsApp media asset")
    media_base64: Optional[str] = Field(None, description="Optional base64 encoded photo")
    media_id: Optional[str] = Field(None, description="WhatsApp Meta media ID")
    caption: Optional[str] = Field(None, description="Optional photo caption")


class MediaUploadResponse(BaseModel):
    session_id: str
    phone: str
    step: str = Field("awaiting_voice")
    image_url: str
    cloudinary_public_id: str
    prompt_text_hi: str
    audio_script_text: str
    mode: str = Field("demo", description="'live' or 'demo'")


class VoiceProcessRequest(BaseModel):
    phone: str = Field(..., description="Artisan E.164 phone number")
    audio_url: Optional[str] = Field(None, description="Direct URL to audio note")
    audio_base64: Optional[str] = Field(None, description="Optional base64 audio data")
    audio_id: Optional[str] = Field(None, description="WhatsApp Meta media ID")
    language: str = Field("hi", description="ISO language code (default: hi)")
    stt_provider: Optional[str] = Field(None, description="Optional provider override: sarvam, whisper, mock")


class VoiceProcessResponse(BaseModel):
    session_id: str
    phone: str
    step: str
    status: str
    transcript: str
    draft_id: Optional[str] = None
    extracted_craft: Optional[CraftExtractionResult] = None
    fair_price: Optional[FairPriceEstimate] = None
    hindi_text: str
    audio_script_text: str
    interactive_buttons: List[InteractiveButton] = Field(default_factory=list)
    missing_fields: List[str] = Field(default_factory=list)
    needs_clarification: bool = False
    mode: str = Field("demo")


class ApproveRequest(BaseModel):
    phone: str = Field(..., description="Artisan E.164 phone number")
    button_id: str = Field(..., description="btn_approve, btn_edit, or btn_cancel")
    draft_id: Optional[str] = Field(None, description="Optional explicit draft UUID")


class ApproveResponse(BaseModel):
    session_id: str
    phone: str
    draft_id: str
    action_taken: str
    new_status: str = Field("pending_validation", description="Must be pending_validation on approval")
    requires_coordinator_review: bool = True
    watermarked_image_url: Optional[str] = None
    hindi_text: str
    audio_script_text: str
    mode: str = Field("demo")


class SessionDetailResponse(BaseModel):
    session_id: str
    phone: str
    artisan_id: Optional[str] = None
    step: str
    status: str
    image_url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None
    transcript: Optional[str] = None
    extracted_craft: Optional[Dict[str, Any]] = None
    fair_price: Optional[Dict[str, Any]] = None
    draft_id: Optional[str] = None
    draft_status: Optional[str] = None
    last_activity_at: str
    mode: str = Field("demo")
