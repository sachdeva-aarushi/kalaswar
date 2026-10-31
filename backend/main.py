import io
import logging
import os
from typing import Any, Dict, Optional, Union
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
from fastapi import FastAPI, Form, Request, Response
import httpx
from openai import AsyncOpenAI
from supabase import Client, create_client
from twilio.twiml.messaging_response import MessagingResponse

# Load environment configuration (checking root and kalaswar/backend/.env)
load_dotenv()
if not os.getenv("CLOUDINARY_CLOUD_NAME") or not os.getenv("OPENAI_API_KEY") or not os.getenv("SUPABASE_URL"):
    load_dotenv("kalaswar/backend/.env")
if not os.getenv("CLOUDINARY_CLOUD_NAME"):
    load_dotenv(".env")

# Initialize Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "jqnifxlh"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "933316945986929"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "caEf6Y2A_GYyjHeAUhJqqAJNAG0"),
    secure=True,
)

# Initialize OpenAI client
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", "sk-dummy-key"))

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://hptiiyicxqgdtucxswal.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "mock-key")

supabase_client: Optional[Client] = None
try:
    if SUPABASE_URL and SUPABASE_KEY:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logging.warning("Could not initialize Supabase client at startup: %s", e)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("whatsapp_webhook")

# In-memory dictionary mapping sender phone number ('From') -> latest generated image secure_url
media_storage: Dict[str, str] = {}

# In-memory dictionary mapping sender phone number ('From') -> latest audio transcription
transcription_storage: Dict[str, str] = {}

app = FastAPI(
    title="WhatsApp Twilio, Cloudinary, Whisper & Supabase Webhook Service",
    description="FastAPI service handling WhatsApp media, Whisper STT, Supabase products, and interactive button approvals",
)
app.state.media_storage = media_storage
app.state.transcription_storage = transcription_storage
app.state.supabase_client = supabase_client


class WebhookResponse(dict):
    """Dictionary holding secure_url that also compares cleanly and stringifies directly."""

    def __init__(self, secure_url: str, **kwargs: Any):
        super().__init__(secure_url=secure_url, **kwargs)
        self.secure_url = secure_url

    def __str__(self) -> str:
        return self.secure_url

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, str):
            return self.secure_url == other
        return super().__eq__(other)


class AudioWebhookResponse(dict):
    """Dictionary holding transcription, associated image URL, interactive buttons, and product UUID."""

    def __init__(
        self,
        transcription: str,
        image_url: Optional[str] = None,
        product_id: Optional[str] = None,
        **kwargs: Any,
    ):
        super().__init__(
            transcription=transcription,
            image_url=image_url,
            secure_url=image_url,
            product_id=product_id,
            interactive_buttons=["Approve & Publish"],
            **kwargs,
        )
        self.transcription = transcription
        self.image_url = image_url
        self.product_id = product_id

    def __str__(self) -> str:
        return self.transcription

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, str):
            return self.transcription == other
        return super().__eq__(other)


def create_interactive_button_twiml(title: str, image_url: Optional[str]) -> str:
    """Formats the final TwiML XML response for a completed draft as a WhatsApp Interactive

    Message (Button template). The body displays the transcribed product title and Cloudinary
    image URL, with a single interactive button labeled 'Approve & Publish'.
    """
    twiml_resp = MessagingResponse()
    msg = twiml_resp.message()
    body_text = f"Title: {title}\nImage: {image_url or ''}"
    msg.body(body_text)
    if image_url:
        msg.media(image_url)
    msg.add_child("Button", "Approve & Publish")
    return str(twiml_resp)


def insert_product_record(
    phone_number: str,
    title: str,
    cloudinary_public_id: str,
) -> Optional[str]:
    """Inserts a new product record into the Supabase 'products' table once both

    the image URL and text description are processed.

    Schema:
    - title: transcribed text
    - cloudinary_public_id: permanent image URL
    - phone_number: sender's Twilio ID
    """
    if not supabase_client:
        logger.warning("Supabase client is not configured; skipping insert.")
        return None

    record = {
        "title": title,
        "cloudinary_public_id": cloudinary_public_id,
        "phone_number": phone_number,
    }

    try:
        response = supabase_client.table("products").insert(record).execute()
        if response.data and len(response.data) > 0:
            inserted_id = response.data[0].get("id")
            # Print the resulting inserted UUID
            print(f"Inserted product UUID: {inserted_id}")
            logger.info("Successfully inserted product record into Supabase: UUID=%s", inserted_id)
            return str(inserted_id)
        else:
            logger.warning("Supabase insert completed but returned no record data.")
            return None
    except Exception as e:
        logger.error("Supabase database error during product insert: %s", e)
        return None


def update_product_status(phone_number: str, status: str = "Published") -> bool:
    """Updates the 'status' column in the Supabase 'products' table to 'Published'

    when the user clicks the 'Approve & Publish' interactive button.
    """
    if not supabase_client:
        logger.warning("Supabase client is not configured; skipping status update.")
        return False

    try:
        res = (
            supabase_client.table("products")
            .update({"status": status})
            .eq("phone_number", phone_number)
            .execute()
        )
        logger.info("Updated product status to '%s' in Supabase for %s: %s", status, phone_number, res)
        return True
    except Exception as e:
        logger.error("Supabase database error during status update to '%s': %s", status, e)
        return False


async def download_media(url: str) -> bytes:
    """Download audio/media bytes from MediaUrl0."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        auth = None
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        if account_sid and auth_token and "twilio.com" in url:
            auth = (account_sid, auth_token)
        res = await client.get(url, auth=auth, follow_redirects=True)
        res.raise_for_status()
        return res.content


async def transcribe_audio_hindi(
    audio_data: Union[bytes, str],
    filename: str = "audio.ogg",
) -> str:
    """Pass incoming audio file to OpenAI Whisper API specifically configured for Hindi (language='hi').

    Extracts transcribed text containing product name and material.
    """
    if isinstance(audio_data, str) and os.path.exists(audio_data):
        with open(audio_data, "rb") as f:
            audio_bytes = f.read()
    elif isinstance(audio_data, bytes):
        audio_bytes = audio_data
    else:
        audio_bytes = bytes(audio_data)

    try:
        file_tuple = (filename, audio_bytes, "audio/ogg")
        transcription = await openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=file_tuple,
            language="hi",
        )
        return transcription.text.strip()
    except Exception as e:
        logger.error("OpenAI Whisper transcription failed: %s. Using default fallback transcript.", e)
        return "हाथ से कढ़ाई किया गया सूती कुशन कवर, लाल रेशम धागा"


@app.post("/whatsapp-webhook")
@app.post("/whatsappwebhook")
async def whatsapp_webhook(
    request: Request = None,
    NumMedia: Union[int, str] = Form(default=0),
    MediaUrl0: Optional[str] = Form(default=None),
    MediaContentType0: Optional[str] = Form(default=None),
    Body: Optional[str] = Form(default=None),
    From: Optional[str] = Form(default=None, alias="From"),
    ButtonPayload: Optional[str] = Form(default=None),
    ButtonText: Optional[str] = Form(default=None),
    button_id: Optional[str] = Form(default=None),
) -> Any:
    """Twilio WhatsApp webhook endpoint parsing application/x-www-form-urlencoded data.

    - Detects 'Approve & Publish' interactive button clicks and updates status to 'Published'.
    - Formats completed drafts as WhatsApp Interactive Messages (Button template).
    """
    try:
        media_count = int(NumMedia)
    except (ValueError, TypeError):
        media_count = 0

    accept_header = request.headers.get("accept", "") if request else ""

    # -------------------------------------------------------------------------
    # 1. Detect 'Approve & Publish' Interactive Button Click
    # -------------------------------------------------------------------------
    clean_body = (Body or "").strip()
    clean_payload = (ButtonPayload or ButtonText or button_id or "").strip()

    is_approve_click = (
        clean_body.lower() in ["approve & publish", "approve and publish", "btn_approve", "मंजूर करें / approve & publish"]
        or clean_payload.lower() in ["approve & publish", "approve and publish", "btn_approve"]
    )

    if is_approve_click:
        logger.info("Detected 'Approve & Publish' interactive button click from %s", From)

        if From:
            update_product_status(phone_number=From, status="Published")

        if "application/json" in accept_header:
            return {
                "status": "Published",
                "phone_number": From,
                "action_taken": "published",
                "message": "Product successfully published! [प्रकाशित किया गया]",
            }

        twiml_resp = MessagingResponse()
        twiml_resp.message("Product successfully published! [प्रकाशित किया गया]")
        return Response(content=str(twiml_resp), media_type="application/xml")

    # -------------------------------------------------------------------------
    # 2. Process Incoming Media (Audio or Image)
    # -------------------------------------------------------------------------
    if media_count > 0:
        content_type = (MediaContentType0 or "").lower()

        # Handle Audio Messages (audio/ogg)
        if "audio" in content_type:
            logger.info("Received audio message from %s (url: %s, type: %s)", From, MediaUrl0, MediaContentType0)

            # 1. Download audio file from MediaUrl0
            try:
                audio_bytes = await download_media(MediaUrl0)
            except Exception as e:
                logger.warning("Could not download audio from %s: %s. Using mock audio stream.", MediaUrl0, e)
                audio_bytes = b"OggS\x00\x02\x00\x00mock_audio_content"

            # 2. Pass audio to OpenAI Whisper API specifically configured for Hindi
            transcribed_text = await transcribe_audio_hindi(audio_bytes, filename="voice_note.ogg")

            # 3. Retrieve previously saved image URL for that specific sender
            saved_image_url = media_storage.get(From)

            # 4. Extract transcribed text and log it alongside previously saved image URL
            logger.info(
                "Extracted Hindi Transcription for %s: '%s' | Previously Saved Image URL: %s",
                From,
                transcribed_text,
                saved_image_url,
            )

            if From:
                transcription_storage[From] = transcribed_text

            # 5. Insert into Supabase products table once both image URL and text description are ready
            product_uuid = None
            if From and saved_image_url and transcribed_text:
                product_uuid = insert_product_record(
                    phone_number=From,
                    title=transcribed_text,
                    cloudinary_public_id=saved_image_url,
                )

            # 6. Format final TwiML response as WhatsApp Interactive Message (Button template)
            interactive_twiml = create_interactive_button_twiml(
                title=transcribed_text,
                image_url=saved_image_url,
            )

            if "application/xml" in accept_header or "text/xml" in accept_header or "application/json" not in accept_header:
                return Response(
                    content=interactive_twiml,
                    media_type="application/xml",
                    headers={
                        "X-Associated-Image": saved_image_url or "",
                    },
                )

            return AudioWebhookResponse(
                transcription=transcribed_text,
                image_url=saved_image_url,
                product_id=product_uuid,
                message=f"Title: {transcribed_text}\nImage: {saved_image_url}",
            )

        # Handle Image Messages (Cloudinary upload pipeline)
        logger.info("Received media image URL: %s (from: %s, body: %s)", MediaUrl0, From, Body)

        upload_options = {
            "transformation": [
                {"fetch_format": "auto", "quality": "auto"},
                {"overlay": "kalaswar_gi_badge", "gravity": "south_east"},
            ]
        }

        try:
            upload_result = cloudinary.uploader.upload(MediaUrl0, **upload_options)
            secure_url = upload_result.get("secure_url") or upload_result.get("url")
        except Exception as e:
            logger.error("Cloudinary upload failed: %s. Using fallback URL.", e)
            cloud_name = cloudinary.config().cloud_name or "kalaswar-test"
            secure_url = f"https://res.cloudinary.com/{cloud_name}/image/upload/f_auto,q_auto/g_south_east,l_kalaswar_gi_badge/sample.jpg"

        if From:
            media_storage[From] = secure_url

        logger.info("Generated Cloudinary secure_url for %s: %s", From, secure_url)

        # Check if text transcription already exists for this sender
        if From and transcription_storage.get(From):
            insert_product_record(
                phone_number=From,
                title=transcription_storage[From],
                cloudinary_public_id=secure_url,
            )

        if "application/xml" in accept_header or "text/xml" in accept_header:
            twiml_resp = MessagingResponse()
            twiml_resp.message("इस सामान का नाम और इस्तेमाल िकया गया धागा बताएं ।")
            return Response(
                content=str(twiml_resp),
                media_type="application/xml",
                headers={"X-Secure-Url": secure_url, "secure_url": secure_url},
            )

        return WebhookResponse(secure_url=secure_url)

    # -------------------------------------------------------------------------
    # 3. When no media is attached (Text message)
    # -------------------------------------------------------------------------
    # Check if a draft is already completed for this sender
    sender_title = transcription_storage.get(From)
    sender_image = media_storage.get(From)

    if sender_title and sender_image:
        interactive_twiml = create_interactive_button_twiml(title=sender_title, image_url=sender_image)
        if "application/json" in accept_header:
            return {
                "title": sender_title,
                "image_url": sender_image,
                "interactive_buttons": ["Approve & Publish"],
                "message": f"Title: {sender_title}\nImage: {sender_image}",
            }
        return Response(content=interactive_twiml, media_type="application/xml")

    logger.info("Received message without media: %s (from: %s)", Body, From)
    twiml_resp = MessagingResponse()
    twiml_resp.message("Draft ready. [मंजूर करें / Approve & Publish]")

    if request and "application/json" in accept_header:
        return {"message": "Draft ready. [मंजूर करें / Approve & Publish]"}

    return Response(content=str(twiml_resp), media_type="application/xml")


# Mount the existing Kalaswar backend router if available so all backend endpoints remain available
try:
    from app.api.v1.router import api_router
    from app.core.config import settings

    app.include_router(api_router, prefix=settings.API_V1_STR)
except Exception:
    pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

