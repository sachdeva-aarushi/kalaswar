import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from uuid import UUID, uuid4

from app.adapters.cloudinary import CloudinaryAdapter, cloudinary_adapter
from app.adapters.llm import LlmAdapter, generate_clarification_question, get_llm_adapter
from app.adapters.stt import SttAdapter, get_stt_adapter
from app.adapters.supabase import SupabaseAdapter, supabase_adapter
from app.core.logging import logger
from app.schemas.whatsapp_listing import (
    ApproveResponse,
    CraftExtractionResult,
    FairPriceEstimate,
    InteractiveButton,
    MediaUploadResponse,
    SessionDetailResponse,
    VoiceProcessResponse,
)
from app.services.audit import AuditService, audit_service
from app.services.fairprice import calculate_fair_price

# In-memory fallback cache for sessions when Supabase is offline/mocked
_IN_MEMORY_SESSIONS: Dict[str, Dict[str, Any]] = {}
_IN_MEMORY_DRAFTS: Dict[str, Dict[str, Any]] = {}


class ArtisanListingService:
    def __init__(
        self,
        cloudinary: Optional[CloudinaryAdapter] = None,
        stt: Optional[SttAdapter] = None,
        llm: Optional[LlmAdapter] = None,
        db: Optional[SupabaseAdapter] = None,
        audit: Optional[AuditService] = None,
    ):
        self.cloudinary = cloudinary or cloudinary_adapter
        self.stt = stt or get_stt_adapter()
        self.llm = llm or get_llm_adapter()
        self.db = db or supabase_adapter
        self.audit = audit or audit_service

    async def get_or_create_session(self, phone: str) -> Dict[str, Any]:
        """Loads active session from Supabase or in-memory fallback cache."""
        clean_phone = phone.strip()
        # Check in-memory first for fast state retrieval
        if clean_phone in _IN_MEMORY_SESSIONS:
            return _IN_MEMORY_SESSIONS[clean_phone]

        # Try querying Supabase
        if self.db.base_url:
            try:
                records = await self.db.query_records(
                    "voice_sessions",
                    params={
                        "whatsapp_phone": f"eq.{clean_phone}",
                        "status": "eq.active",
                        "order": "last_activity_at.desc",
                        "limit": "1",
                    },
                )
                if records:
                    session = records[0]
                    _IN_MEMORY_SESSIONS[clean_phone] = session
                    return session
            except Exception as e:
                logger.warning("Could not load session from Supabase: %s", e)

        # Create new session
        new_session = {
            "id": str(uuid4()),
            "whatsapp_phone": clean_phone,
            "language": "hi",
            "intent": "list_product",
            "status": "active",
            "step": "awaiting_media",
            "context": {},
            "transcript": [],
            "listing_draft_id": None,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "last_activity_at": datetime.now(timezone.utc).isoformat(),
        }
        _IN_MEMORY_SESSIONS[clean_phone] = new_session
        return new_session

    async def save_session(self, session: Dict[str, Any]) -> None:
        """Persists updated session state to memory and Supabase."""
        phone = session["whatsapp_phone"]
        session["last_activity_at"] = datetime.now(timezone.utc).isoformat()
        _IN_MEMORY_SESSIONS[phone] = session

        if self.db.base_url:
            try:
                # Upsert to voice_sessions table
                await self.db.upsert_record("voice_sessions", session, use_service_role=True)
            except Exception as e:
                logger.warning("Failed to persist session to Supabase: %s", e)

    async def process_media(
        self,
        phone: str,
        media_source: Union[str, bytes],
        caption: Optional[str] = None,
    ) -> MediaUploadResponse:
        """
        Step 1 (Media Capture):
        Stores product photo in Cloudinary with auto-format (f_auto, q_auto) and background clean.
        Advances session step to awaiting_voice and returns authentic Hindi audio prompt.
        """
        session = await self.get_or_create_session(phone)

        # Upload image to Cloudinary
        upload_res = await self.cloudinary.upload_image(media_source, phone=phone, background_clean=True)

        session["step"] = "awaiting_voice"
        session["context"]["media"] = {
            "image_url": upload_res["url"],
            "secure_url": upload_res.get("secure_url", upload_res["url"]),
            "cloudinary_public_id": upload_res["public_id"],
            "caption": caption,
            "mode": upload_res.get("mode", "demo"),
        }
        await self.save_session(session)

        # Voice prompt specified in PDF Section 4
        prompt_text_hi = "इस सामान का नाम और इस्तेमाल किया गया धागा बताएं।"
        audio_script = "नमस्ते! कृपया इस सुंदर सामान का नाम, शिल्प और इस्तेमाल किया गया धागा बोलकर बताएं।"

        return MediaUploadResponse(
            session_id=session["id"],
            phone=phone,
            step="awaiting_voice",
            image_url=upload_res["url"],
            cloudinary_public_id=upload_res["public_id"],
            prompt_text_hi=prompt_text_hi,
            audio_script_text=audio_script,
            mode=upload_res.get("mode", "demo"),
        )

    async def process_voice(
        self,
        phone: str,
        audio_source: Union[str, bytes],
        language: str = "hi",
        stt_provider: Optional[str] = None,
    ) -> VoiceProcessResponse:
        """
        Step 2 & 3 (Voice Prompt & Auto-Drafting):
        - Transcribes audio via SttAdapter (Sarvam / Whisper / Mock).
        - Extracts structured craft fields via LlmAdapter.
        - Validates fields via Pydantic; missing fields trigger follow-up question instead of guessing.
        - Calculates FairPrice estimate.
        - Creates draft row in listing_drafts.
        - Returns Hindi summary, audio script text, and interactive action buttons.
        """
        session = await self.get_or_create_session(phone)

        # 1. Speech to Text Transcription
        if stt_provider and stt_provider.lower() in ("sarvam", "whisper"):
            stt_adapter = get_stt_adapter(stt_provider)
        else:
            stt_adapter = self.stt

        transcript = await stt_adapter.transcribe(audio_source, language=language)


        # Append transcript log to session
        session_transcripts = session.get("transcript", [])
        session_transcripts.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "text": transcript,
            "language": language,
        })
        session["transcript"] = session_transcripts

        # 2. LLM Structured Extraction
        extraction = await self.llm.extract_craft_attributes(transcript, language=language)

        # 3. Validation & Honesty Gate
        missing = extraction.missing_fields()
        if missing or not extraction.is_complete():
            logger.info("AI extraction incomplete. Missing fields: %s. Asking follow-up question.", missing)
            clarification_question = generate_clarification_question(missing, language=language)
            session["step"] = "needs_clarification"
            session["context"]["last_extraction"] = extraction.model_dump()
            session["context"]["missing_fields"] = missing
            await self.save_session(session)

            return VoiceProcessResponse(
                session_id=session["id"],
                phone=phone,
                step="needs_clarification",
                status="needs_clarification",
                transcript=transcript,
                draft_id=None,
                extracted_craft=extraction,
                fair_price=None,
                hindi_text=clarification_question,
                audio_script_text=clarification_question,
                interactive_buttons=[
                    InteractiveButton(id="btn_retry_voice", title="पुनः बोलें / Speak Again")
                ],
                missing_fields=missing,
                needs_clarification=True,
                mode=session["context"].get("media", {}).get("mode", "demo"),
            )

        # 4. FairPrice Calculation
        fair_price = calculate_fair_price(extraction)

        # 5. Create listing_drafts record
        draft_id = str(uuid4())
        media_ctx = session["context"].get("media", {})
        image_url = media_ctx.get("image_url", "https://res.cloudinary.com/kalaswar-demo/image/upload/sample.webp")
        cloudinary_id = media_ctx.get("cloudinary_public_id", "kalaswar/artisans/demo_sample")

        artisan_id = session.get("artisan_id") or "cccccccc-0001-0000-0000-000000000001"
        shg_id = session.get("shg_id") or "bbbbbbbb-0001-0000-0000-000000000001"

        draft_record = {
            "id": draft_id,
            "artisan_id": artisan_id,
            "shg_id": shg_id,
            "source": "whatsapp",
            "title": extraction.title,
            "description": f"{extraction.craft} handcrafted using {', '.join(extraction.materials)}. Colour: {extraction.colour}.",
            "category": extraction.craft or "Crafts",
            "materials": extraction.materials,
            "price_suggestion": fair_price.suggested_price,
            "currency": "INR",
            "images": [{"url": image_url, "cloudinary_public_id": cloudinary_id}],
            "raw_transcript": transcript,
            "ai_assisted": True,
            "structured": {
                "extraction": extraction.model_dump(),
                "pricing": fair_price.model_dump(),
            },
            "status": "draft",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # Save to memory and try saving to Supabase
        _IN_MEMORY_DRAFTS[draft_id] = draft_record
        if self.db.base_url:
            try:
                await self.db.upsert_record("listing_drafts", draft_record, use_service_role=True)
            except Exception as e:
                logger.warning("Could not persist listing draft to Supabase: %s", e)


        # Update session
        session["step"] = "awaiting_approval"
        session["listing_draft_id"] = draft_id
        session["context"]["last_extraction"] = extraction.model_dump()
        session["context"]["last_pricing"] = fair_price.model_dump()
        session["context"]["draft_id"] = draft_id
        await self.save_session(session)

        # 6. Compose Hindi Text Summary & Audio Script
        hindi_summary = (
            f"✅ आपके उत्पाद का विवरण तैयार है:\n\n"
            f"📌 नाम: {extraction.title}\n"
            f"🧵 शिल्प: {extraction.craft}\n"
            f"🎨 रंग व सामग्री: {extraction.colour}, {', '.join(extraction.materials)}\n"
            f"💰 सुझाई गई उचित कीमत: ₹{fair_price.suggested_price:.0f} "
            f"(सीधे कारीगर की आय: ₹{fair_price.artisan_earnings:.0f})\n\n"
            f"कृपया नीचे दिए गए बटन पर क्लिक करके मंजूर करें।"
        )

        audio_script = (
            f"नमस्ते! आपके द्वारा बताए गए {extraction.title} का ड्राफ्ट तैयार कर लिया गया है। "
            f"इसकी उचित खुदरा कीमत ₹{int(fair_price.suggested_price)} तय की गई है, "
            f"जिसमें से ₹{int(fair_price.artisan_earnings)} सीधे आपके बैंक खाते में जाएंगे। "
            f"क्या आप इसे मंजूर करते हैं?"
        )

        buttons = [
            InteractiveButton(id="btn_approve", title="मंजूर करें / Approve & Publish"),
            InteractiveButton(id="btn_edit", title="बदलाव करें / Edit Details"),
            InteractiveButton(id="btn_cancel", title="रद्द करें / Cancel"),
        ]

        return VoiceProcessResponse(
            session_id=session["id"],
            phone=phone,
            step="awaiting_approval",
            status="draft_created",
            transcript=transcript,
            draft_id=draft_id,
            extracted_craft=extraction,
            fair_price=fair_price,
            hindi_text=hindi_summary,
            audio_script_text=audio_script,
            interactive_buttons=buttons,
            missing_fields=[],
            needs_clarification=False,
            mode=media_ctx.get("mode", "demo"),
        )

    async def process_approval(
        self,
        phone: str,
        button_id: str,
        draft_id: Optional[str] = None,
    ) -> ApproveResponse:
        """
        Step 3 (Approve Button Action):
        Applies coordinator-validation rule:
        - When artisan approves, status changes to 'pending_validation'.
        - Cloudinary GI watermark badge overlay is dynamically generated.
        - Appends action audit log to action_audit_logs.
        - Session status advances to 'completed'.
        """
        session = await self.get_or_create_session(phone)
        target_draft_id = draft_id or session.get("listing_draft_id") or session["context"].get("draft_id")

        if not target_draft_id:
            # Fallback draft ID if session had not linked one
            target_draft_id = str(uuid4())

        # Retrieve draft record
        draft = _IN_MEMORY_DRAFTS.get(target_draft_id, {})
        media_ctx = session["context"].get("media", {})
        cloudinary_id = media_ctx.get("cloudinary_public_id") or "kalaswar/artisans/demo_sample"

        if button_id == "btn_approve":
            # Coordinator-validation rule: status MUST be pending_validation
            new_status = "pending_validation"
            action_taken = "artisan_approved"

            # Apply GI Watermark overlay
            watermarked_url = self.cloudinary.apply_gi_watermark(
                cloudinary_id,
                craft_name=draft.get("category", "GI-Craft"),
            )

            # Update draft
            draft["status"] = new_status
            draft["watermarked_image_url"] = watermarked_url
            draft["updated_at"] = datetime.now(timezone.utc).isoformat()
            _IN_MEMORY_DRAFTS[target_draft_id] = draft

            if self.db.base_url:
                try:
                    await self.db.upsert_record("listing_drafts", draft, use_service_role=True)
                except Exception as e:
                    logger.warning("Could not update listing draft in Supabase: %s", e)


            # Log to action_audit_logs table
            await self.audit.log_action(
                actor=f"Artisan ({phone})",
                action="artisan_approved_listing_draft",
                entity="listing_drafts",
                entity_id=UUID(target_draft_id),
                payload={
                    "phone": phone,
                    "new_status": new_status,
                    "requires_coordinator_review": True,
                    "watermarked_image_url": watermarked_url,
                },
            )

            # Complete voice session
            session["status"] = "completed"
            session["step"] = "completed"
            session["completed_at"] = datetime.now(timezone.utc).isoformat()
            await self.save_session(session)

            hindi_text = (
                "🎉 आपका ड्राफ्ट सफलतापूर्वक मंजूर कर लिया गया है!\n\n"
                "📋 कोऑर्डिनेटर सत्यापन नियम (Coordinator Rule):\n"
                "सरकारी और ई-कॉमर्स गुणवत्ता मानकों के अनुसार, यह ड्राफ्ट अब आपके "
                "स्वयं सहायता समूह (SHG) के कोऑर्डिनेटर के पास अंतिम सत्यापन (Validation) "
                "के लिए भेजा गया है। जैसे ही वे इसे अंतिम मंजूरी देंगे, यह उत्पाद ONDC और कलास्वर स्टोर पर लाइव हो जाएगा।"
            )

            audio_script = (
                "बधाई हो! आपका उत्पाद ड्राफ्ट मंजूर हो गया है और GI सत्यापन बैज के साथ सुरक्षित कर लिया गया है। "
                "अंतिम समीक्षा के लिए यह आपके SHG कोऑर्डिनेटर के पास पहुंच गया है।"
            )

            return ApproveResponse(
                session_id=session["id"],
                phone=phone,
                draft_id=target_draft_id,
                action_taken=action_taken,
                new_status=new_status,
                requires_coordinator_review=True,
                watermarked_image_url=watermarked_url,
                hindi_text=hindi_text,
                audio_script_text=audio_script,
                mode=media_ctx.get("mode", "demo"),
            )

        elif button_id == "btn_edit":
            session["step"] = "awaiting_voice"
            await self.save_session(session)
            return ApproveResponse(
                session_id=session["id"],
                phone=phone,
                draft_id=target_draft_id,
                action_taken="artisan_requested_edit",
                new_status="draft",
                requires_coordinator_review=False,
                watermarked_image_url=None,
                hindi_text="कृपया वह जानकारी दोबारा बोलकर बताएं जिसे आप बदलना चाहते हैं।",
                audio_script_text="कृपया जो जानकारी आप बदलना चाहते हैं, उसे बोलकर बताएं।",
                mode="demo",
            )
        else:  # btn_cancel
            session["status"] = "abandoned"
            session["step"] = "cancelled"
            await self.save_session(session)
            if target_draft_id in _IN_MEMORY_DRAFTS:
                _IN_MEMORY_DRAFTS[target_draft_id]["status"] = "archived"

            return ApproveResponse(
                session_id=session["id"],
                phone=phone,
                draft_id=target_draft_id,
                action_taken="artisan_cancelled",
                new_status="archived",
                requires_coordinator_review=False,
                watermarked_image_url=None,
                hindi_text="उत्पाद लिस्टिंग प्रक्रिया रद्द कर दी गई है। नई लिस्टिंग शुरू करने के लिए कभी भी फोटो भेजें।",
                audio_script_text="लिस्टिंग रद्द कर दी गई है। धन्यवाद।",
                mode="demo",
            )

    async def get_session(self, phone: str) -> SessionDetailResponse:
        """Retrieves active or latest session state for a phone number."""
        session = await self.get_or_create_session(phone)
        draft_id = session.get("listing_draft_id") or session.get("context", {}).get("draft_id")
        draft = _IN_MEMORY_DRAFTS.get(draft_id, {}) if draft_id else {}
        media = session.get("context", {}).get("media", {})

        return SessionDetailResponse(
            session_id=session["id"],
            phone=phone,
            artisan_id=session.get("artisan_id"),
            step=session.get("step", "greeting"),
            status=session.get("status", "active"),
            image_url=media.get("image_url"),
            cloudinary_public_id=media.get("cloudinary_public_id"),
            transcript=session.get("transcript", [{}])[-1].get("text") if session.get("transcript") else None,
            extracted_craft=session.get("context", {}).get("last_extraction"),
            fair_price=session.get("context", {}).get("last_pricing"),
            draft_id=draft_id,
            draft_status=draft.get("status", "draft"),
            last_activity_at=session.get("last_activity_at", datetime.now(timezone.utc).isoformat()),
            mode=media.get("mode", "demo"),
        )


artisan_listing_service = ArtisanListingService()
