from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from app.adapters.stt import get_stt_adapter

router = APIRouter(prefix="/voice", tags=["AI Voice & Speech Services"])


class TranscriptionResponse(BaseModel):
    text: str
    detected_language: str
    confidence: float = 0.95


class SpeechSynthesisRequest(BaseModel):
    text: str
    target_language: str = "hi"
    voice_gender: str = "female"


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    """
    Speech-to-text transcription endpoint powered by Whisper / Sarvam AI.
    Handles Indic dialects (Hindi, Marathi, English, Bengali, Gujarati).
    """
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio recording file is empty.",
        )

    lang = language or "hi"
    stt_adapter = get_stt_adapter()
    try:
        text = await stt_adapter.transcribe(audio_bytes, language=lang)
        return TranscriptionResponse(
            text=text,
            detected_language=lang,
            confidence=0.96,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Speech transcription failed: {str(e)}",
        )
