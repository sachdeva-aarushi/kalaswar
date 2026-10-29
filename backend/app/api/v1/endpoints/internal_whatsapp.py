from fastapi import APIRouter, Depends
from app.api.deps import verify_service_token
from app.schemas.whatsapp_listing import (
    ApproveRequest,
    ApproveResponse,
    MediaUploadRequest,
    MediaUploadResponse,
    SessionDetailResponse,
    VoiceProcessRequest,
    VoiceProcessResponse,
)
from app.services.artisan_listing import artisan_listing_service

router = APIRouter(prefix="/internal/whatsapp", tags=["WhatsApp Artisan Listing Pipeline (Internal)"])


@router.post(
    "/media",
    response_model=MediaUploadResponse,
    summary="Step 1: Ingest artisan product photo",
    dependencies=[Depends(verify_service_token)],
)
async def upload_artisan_media(payload: MediaUploadRequest):
    """
    Step 1 (Media Capture):
    - Ingests artisan photo from WhatsApp.
    - Stores asset in Cloudinary with auto-format (f_auto, q_auto) and background clean.
    - Initializes/updates voice session state to 'awaiting_voice'.
    - Returns authentic Hindi audio prompt asking for craft and materials.
    """
    source = payload.media_url or payload.media_base64 or payload.media_id or "demo_image"
    return await artisan_listing_service.process_media(
        phone=payload.phone,
        media_source=source,
        caption=payload.caption,
        whatsapp_message_id=payload.whatsapp_message_id,
    )


@router.post(
    "/voice",
    response_model=VoiceProcessResponse,
    summary="Step 2: Parse artisan voice note & create draft",
    dependencies=[Depends(verify_service_token)],
)
async def process_artisan_voice(payload: VoiceProcessRequest):
    """
    Step 2 & 3 (Voice Prompt & Auto-Drafting):
    - Transcribes audio note via SttAdapter (Sarvam / Whisper / Mock).
    - Accepts audio/ogg (Opus) and converts with ffmpeg if speech provider requires WAV.
    - Extracts structured craft fields via LlmAdapter (title, craft, materials, colour, language).
    - Validates with Pydantic: missing fields trigger an honest follow-up question instead of guessing.
    - If valid, calculates transparent FairPrice estimate with artisan wage breakdown.
    - Creates draft in listing_drafts with whatsapp_message_id unique tracking.
    - Returns Hindi text, audio-script text, and interactive button IDs.
    - Idempotent: repeated calls with the same whatsapp_message_id return the original response.
    """
    source = payload.audio_url or payload.audio_base64 or payload.audio_id or "demo_audio"
    return await artisan_listing_service.process_voice(
        phone=payload.phone,
        audio_source=source,
        language=payload.language,
        stt_provider=payload.stt_provider,
        whatsapp_message_id=payload.whatsapp_message_id,
        content_type=payload.content_type,
    )


@router.post(
    "/approve",
    response_model=ApproveResponse,
    summary="Step 3: Handle artisan button action with coordinator validation rule",
    dependencies=[Depends(verify_service_token)],
)
async def approve_artisan_draft(payload: ApproveRequest):
    """
    Step 3 (Approve Button Action):
    - When artisan approves (btn_approve), the Coordinator-Validation rule applies:
      Status transitions strictly to 'pending_validation' (publishing needs coordinator approval).
    - Generates Cloudinary GI verification badge watermark overlay on product asset.
    - Records immutable action log to action_audit_logs.
    - Completes the voice session.
    - Idempotent: repeated calls with the same whatsapp_message_id return the original response.
    """
    return await artisan_listing_service.process_approval(
        phone=payload.phone,
        button_id=payload.button_id,
        draft_id=payload.draft_id,
        whatsapp_message_id=payload.whatsapp_message_id,
    )


@router.get(
    "/session/{phone}",
    response_model=SessionDetailResponse,
    summary="Retrieve current conversation session state",
    dependencies=[Depends(verify_service_token)],
)
async def get_artisan_session(phone: str):
    """
    Returns active or recent conversation session state, draft details, and media for an artisan.
    """
    return await artisan_listing_service.get_session(phone=phone)
