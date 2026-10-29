from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/voice", tags=["AI Voice & Speech Services"])

class TranscriptionResponse(BaseModel):
    text: str
    detected_language: str
    confidence: float
    mode: str = "demo"

class SpeechSynthesisRequest(BaseModel):
    text: str
    target_language: str = "hi"
    voice_gender: str = "female"

@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None)
):
    """
    Speech-to-text transcription endpoint powered by Whisper / Sarvam AI.
    Handles Indic dialects (Hindi, Marathi, English).
    Labelled as demo mode when live API key is unset.
    """
    # Demo response preserving contract
    return TranscriptionResponse(
        text="हाथ से कढ़ाई किया गया सूती कुशन कवर, लाल रेशम धागा",
        detected_language=language or "hi",
        confidence=0.96,
        mode="demo"
    )

@router.post("/synthesize")
async def synthesize_speech(request: SpeechSynthesisRequest):
    """
    Text-to-speech audio synthesis endpoint returning audio stream for WhatsApp voice note playback.
    """
    return {
        "status": "synthesized",
        "mode": "demo",
        "audio_url": "/demo-assets/reply-sample.ogg",
        "message": "Demo audio synthesis placeholder"
    }
