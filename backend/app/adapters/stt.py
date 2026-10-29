import abc
from typing import Optional, Union
import httpx
from app.core.config import settings
from app.core.logging import logger


class SttAdapter(abc.ABC):
    """Abstract interface for Speech-to-Text providers."""

    @abc.abstractmethod
    async def transcribe(self, audio_source: Union[str, bytes], language: str = "hi") -> str:
        """Transcribes incoming audio bytes or audio URL into text."""
        pass


class MockSttAdapter(SttAdapter):
    """
    Deterministic mock STT adapter returning authentic artisan Hindi speech transcripts.
    Used during development, automated testing, and when external AI keys are absent.
    """

    def __init__(self, default_transcript: Optional[str] = None):
        self.default_transcript = default_transcript or (
            "हाथ से कढ़ाई किया गया सूती कुशन कवर, लाल रेशम धागा, आरी शिल्प, नीला रंग"
        )

    async def transcribe(self, audio_source: Union[str, bytes], language: str = "hi") -> str:
        logger.info("[MockSttAdapter] Returning deterministic Hindi transcript.")
        return self.default_transcript


class SarvamSttAdapter(SttAdapter):
    """
    Sarvam AI Indic Speech-to-Text implementation.
    Optimized for Indian languages and regional dialects.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.SARVAM_API_KEY
        self.endpoint = "https://api.sarvam.ai/speech-to-text"

    async def transcribe(self, audio_source: Union[str, bytes], language: str = "hi") -> str:
        if not self.api_key:
            logger.warning("Sarvam API key not set; falling back to Mock STT.")
            return await MockSttAdapter().transcribe(audio_source, language)

        logger.info("[SarvamSttAdapter] Transcribing audio with language=%s", language)
        headers = {
            "api-subscription-key": self.api_key,
        }
        data = {
            "language_code": f"{language}-IN",
            "model": "saarika:v1",
        }

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                if isinstance(audio_source, bytes):
                    files = {"file": ("audio.wav", audio_source, "audio/wav")}
                    res = await client.post(self.endpoint, headers=headers, data=data, files=files)
                elif isinstance(audio_source, str) and (audio_source.startswith("http://") or audio_source.startswith("https://")):
                    # Fetch audio from URL first
                    audio_res = await client.get(audio_source, timeout=15.0)
                    files = {"file": ("audio.wav", audio_res.content, "audio/wav")}
                    res = await client.post(self.endpoint, headers=headers, data=data, files=files)
                else:
                    return await MockSttAdapter().transcribe(audio_source, language)

                res.raise_for_status()
                result = res.json()
                transcript = result.get("transcript") or result.get("text", "")
                return transcript.strip()
        except Exception as e:
            logger.error("[SarvamSttAdapter] Transcription error: %s. Falling back to mock.", e)
            return await MockSttAdapter().transcribe(audio_source, language)


class WhisperSttAdapter(SttAdapter):
    """
    OpenAI Whisper Speech-to-Text implementation.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.endpoint = "https://api.openai.com/v1/audio/transcriptions"

    async def transcribe(self, audio_source: Union[str, bytes], language: str = "hi") -> str:
        if not self.api_key:
            logger.warning("OpenAI API key not set; falling back to Mock STT.")
            return await MockSttAdapter().transcribe(audio_source, language)

        logger.info("[WhisperSttAdapter] Transcribing audio with language=%s", language)
        headers = {"Authorization": f"Bearer {self.api_key}"}
        data = {
            "model": "whisper-1",
            "language": language,
        }

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                if isinstance(audio_source, bytes):
                    files = {"file": ("audio.mp3", audio_source, "audio/mpeg")}
                    res = await client.post(self.endpoint, headers=headers, data=data, files=files)
                elif isinstance(audio_source, str) and (audio_source.startswith("http://") or audio_source.startswith("https://")):
                    audio_res = await client.get(audio_source, timeout=15.0)
                    files = {"file": ("audio.mp3", audio_res.content, "audio/mpeg")}
                    res = await client.post(self.endpoint, headers=headers, data=data, files=files)
                else:
                    return await MockSttAdapter().transcribe(audio_source, language)

                res.raise_for_status()
                result = res.json()
                return result.get("text", "").strip()
        except Exception as e:
            logger.error("[WhisperSttAdapter] Transcription error: %s. Falling back to mock.", e)
            return await MockSttAdapter().transcribe(audio_source, language)


def get_stt_adapter(provider: Optional[str] = None) -> SttAdapter:
    """Factory creating appropriate SttAdapter based on requested provider and available API keys."""
    if provider:
        p = provider.lower()
        if p == "sarvam" and settings.SARVAM_API_KEY:
            return SarvamSttAdapter()
        elif p == "whisper" and settings.OPENAI_API_KEY:
            return WhisperSttAdapter()
        elif p == "mock":
            return MockSttAdapter()

    # Automatic selection based on active keys
    if settings.SARVAM_API_KEY:
        return SarvamSttAdapter()
    elif settings.OPENAI_API_KEY:
        return WhisperSttAdapter()
    return MockSttAdapter()
