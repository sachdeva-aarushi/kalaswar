import uuid
from fastapi import APIRouter, Query, Response, status
from app.core.config import settings
from app.schemas.whatsapp import (
    WhatsAppWebhookPayload,
    WhatsAppListingDraftRequest,
    WhatsAppListingDraftResponse,
)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Bot Integration"])


@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    """
    Verification endpoint for Meta WhatsApp Cloud API / Webhook.
    """
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain")
    return Response(content="Verification failed", status_code=status.HTTP_403_FORBIDDEN)


@router.post("/webhook")
async def receive_webhook(payload: WhatsAppWebhookPayload):
    """
    Incoming webhook for WhatsApp events: text messages, voice notes, and media uploads.
    """
    return {
        "status": "received",
        "mode": "demo",
        "processed_entries": len(payload.entry),
    }


@router.post("/draft-listing", response_model=WhatsAppListingDraftResponse)
async def draft_listing_from_voice(request: WhatsAppListingDraftRequest):
    """
    Voice-first auto-drafting endpoint:
    Parses artisan voice note + photo, calculates fair price, and generates draft listing.
    """
    draft_id = str(uuid.uuid4())
    return WhatsAppListingDraftResponse(
        draft_id=draft_id,
        title="हाथ से कढ़ाई किया गया सूती कुशन कवर (Handcrafted Cotton Cushion Cover)",
        craft_type="Aari Hand Embroidery",
        extracted_materials=["Cotton fabric", "Silk thread"],
        suggested_price=950.00,
        status="demo_draft",
        audio_reply_url=None,
        interactive_buttons=["Approve & Publish", "Edit Details", "Cancel"],
    )
