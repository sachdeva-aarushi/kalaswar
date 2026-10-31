import abc
import json
from typing import List, Optional
import httpx
from app.core.config import settings
from app.core.logging import logger
from app.schemas.whatsapp_listing import CraftExtractionResult


class LlmAdapter(abc.ABC):
    """Abstract interface for LLM structured extraction from artisan voice transcripts."""

    @abc.abstractmethod
    async def extract_craft_attributes(self, transcript: str, language: str = "hi") -> CraftExtractionResult:
        """Extracts structured product attributes from unstructured voice transcripts."""
        pass


class MockLlmAdapter(LlmAdapter):
    """
    Deterministic Mock LLM adapter.
    Extracts structured craft attributes based on keyword heuristics.
    Strictly permitted during automated tests (APP_ENV=test).
    """

    async def extract_craft_attributes(self, transcript: str, language: str = "hi") -> CraftExtractionResult:
        logger.info("[MockLlmAdapter] Parsing transcript in test environment: '%s'", transcript)
        t_lower = transcript.lower()

        # Handle explicit incomplete test transcripts
        if "incomplete" in t_lower or "सिर्फ धागा" in t_lower or "only thread" in t_lower:
            return CraftExtractionResult(
                title=None,
                craft=None,
                materials=["Silk thread"],
                colour="लाल (Red)",
                language=language,
                confidence=0.5,
            )

        if "missing_craft" in t_lower:
            return CraftExtractionResult(
                title="सूती कुशन कवर (Cotton Cushion Cover)",
                craft=None,
                materials=["Cotton fabric"],
                colour="नीला (Blue)",
                language=language,
                confidence=0.6,
            )

        # Standard craft heuristics
        if "आरी" in transcript or "कढ़ाई" in transcript or "कुशन" in transcript or "cushion" in t_lower:
            title = "हाथ से कढ़ाई किया गया सूती कुशन कवर"
            craft = "Aari Hand Embroidery"
            materials = ["Cotton fabric", "Silk embroidery thread"]
            colour = "लाल और नीला (Red & Blue)"
            hours = 4.0
        elif "वारली" in transcript or "warli" in t_lower:
            title = "पारंपरिक वारली कला कैनवास पेंटिंग"
            craft = "Warli Tribal Art"
            materials = ["Handmade paper / canvas", "Rice paste pigment"]
            colour = "सफेद और गेरुआ (White & Ochre)"
            hours = 6.0
        elif "कांथा" in transcript or "kantha" in t_lower:
            title = "हाथ से सिला हुआ कांथा स्टोल"
            craft = "Kantha Hand Stitched"
            materials = ["Tussar silk fabric", "Cotton threads"]
            colour = "बहु-रंगी (Multicolour)"
            hours = 8.0
        elif "साड़ी" in transcript or "साडी" in transcript or "बुनी" in transcript:
            title = "हाथ से बुनी गई रेशमी साड़ी"
            craft = "Handloom Silk Weaving"
            materials = ["Pure Mulberry Silk", "Zari border"]
            colour = "लाल और सुनहरा (Red & Golden)"
            hours = 14.0
        else:
            title = "हाथ से बना हस्तशिल्प उत्पाद"
            craft = "Traditional Indian Handicraft"
            materials = ["Handmade craft fabric"]
            colour = "प्राकृतिक रंग (Natural)"
            hours = 4.0

        return CraftExtractionResult(
            title=title,
            craft=craft,
            materials=materials,
            colour=colour,
            language=language,
            estimated_labour_hours=hours,
            confidence=0.96,
        )


class OpenAiLlmAdapter(LlmAdapter):
    """
    OpenAI GPT-4o-mini structured JSON extraction implementation.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.endpoint = "https://api.openai.com/v1/chat/completions"

    async def extract_craft_attributes(self, transcript: str, language: str = "hi") -> CraftExtractionResult:
        if not self.api_key:
            if settings.is_test:
                return await MockLlmAdapter().extract_craft_attributes(transcript, language)
            raise RuntimeError("LLM extraction failed: OPENAI_API_KEY is not configured.")

        system_prompt = """You are Kalaswar's expert craft assistant for Indian rural artisans.
Extract product details from the artisan's voice transcript.
Output strictly valid JSON with keys:
- title: string or null (product title in Hindi/English, null if not mentioned)
- craft: string or null (exact craft technique like 'Aari Embroidery', 'Kantha', 'Warli', null if not mentioned)
- materials: array of strings (materials used, empty if not mentioned)
- colour: string or null (colours described, null if not mentioned)
- language: ISO language code (default 'hi')
- estimated_labour_hours: number or null (hours required to make it)

NEVER GUESS. If the artisan did not mention a material or craft, leave that key null or empty."""

        user_content = f"Artisan transcript ({language}): {transcript}"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(self.endpoint, headers=headers, json=body)
                res.raise_for_status()
                data = res.json()
                raw_json = json.loads(data["choices"][0]["message"]["content"])
                return CraftExtractionResult(
                    title=raw_json.get("title"),
                    craft=raw_json.get("craft"),
                    materials=raw_json.get("materials") or [],
                    colour=raw_json.get("colour"),
                    language=raw_json.get("language") or language,
                    estimated_labour_hours=raw_json.get("estimated_labour_hours"),
                    confidence=0.92,
                )
        except Exception as e:
            logger.error("[OpenAiLlmAdapter] Extraction failure: %s", e)
            if settings.is_test:
                return await MockLlmAdapter().extract_craft_attributes(transcript, language)
            raise RuntimeError(f"OpenAI LLM craft extraction failed: {e}")


def get_llm_adapter() -> LlmAdapter:
    """Returns OpenAiLlmAdapter if credentials exist. Mock only permitted in test mode."""
    if settings.OPENAI_API_KEY:
        return OpenAiLlmAdapter()
    if settings.is_test:
        return MockLlmAdapter()
    raise RuntimeError("No LLM provider configured. Please provide OPENAI_API_KEY or GEMINI_API_KEY.")


def generate_clarification_question(missing_fields: List[str], language: str = "hi") -> str:
    """
    Generates an authentic, friendly Hindi voice prompt asking for missing craft details.
    Adheres strictly to the AI honesty rule: missing fields trigger questions instead of guesses.
    """
    if "craft" in missing_fields and "materials" in missing_fields:
        return (
            "धन्यवाद! कृपया बताएं कि यह कौन सा शिल्प (craft) है और इसे बनाने में "
            "कौन सा कपड़ा या धागा (material) इस्तेमाल हुआ है?"
        )
    elif "craft" in missing_fields:
        return (
            "सामान की जानकारी मिल गई है। कृपया इस शिल्प (craft) का नाम बताएं, "
            "जैसे कि आरी कढ़ाई, कांथा, या वारली?"
        )
    elif "materials" in missing_fields:
        return (
            "कृपया बताएं कि इसमें कौन सा सामान या धागा इस्तेमाल हुआ है, "
            "जैसे कि सूती कपड़ा, रेशमी धागा, या मोती?"
        )
    elif "title" in missing_fields:
        return "कृपया इस उत्पाद का नाम बताएं (जैसे कुशन कवर, दुपट्टा, या बैग)?"
    return "कृपया अपने उत्पाद के बारे में थोड़ा और विस्तार से बताएं।"
