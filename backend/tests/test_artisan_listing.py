import pytest
from app.core.config import settings

SERVICE_TOKEN = settings.INTERNAL_SERVICE_TOKEN
AUTH_HEADER = {"X-Service-Token": SERVICE_TOKEN}
TEST_PHONE = "+919876543210"


def test_internal_whatsapp_token_protection(client):
    """Verify internal WhatsApp endpoints reject requests missing or using invalid service tokens."""
    # Missing token -> 401
    res_no_tok = client.post("/internal/whatsapp/media", json={"phone": TEST_PHONE})
    assert res_no_tok.status_code == 401
    assert res_no_tok.json()["error"]["code"] == "UNAUTHORIZED"

    # Invalid token -> 401
    res_bad_tok = client.post(
        "/internal/whatsapp/media",
        headers={"X-Service-Token": "bad_token"},
        json={"phone": TEST_PHONE},
    )
    assert res_bad_tok.status_code == 401

    # Bearer token format accepted
    res_bearer = client.post(
        "/internal/whatsapp/media",
        headers={"Authorization": f"Bearer {SERVICE_TOKEN}"},
        json={"phone": TEST_PHONE, "media_url": "https://example.com/artisan_sample.jpg"},
    )
    assert res_bearer.status_code == 200


def test_artisan_media_upload_flow(client):
    """
    Step 1: Artisan sends product photo via WhatsApp.
    Cloudinary signed/mock upload processes image and returns Hindi voice prompt.
    """
    payload = {
        "phone": TEST_PHONE,
        "media_url": "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2",
        "caption": "हाथ से कढ़ाई किया गया कुशन कवर",
    }
    response = client.post("/internal/whatsapp/media", headers=AUTH_HEADER, json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["phone"] == TEST_PHONE
    assert data["step"] == "awaiting_voice"
    assert "image_url" in data
    assert "cloudinary_public_id" in data
    # Prompt text specified in PDF Section 4
    assert "इस सामान का नाम और इस्तेमाल किया गया धागा बताएं" in data["prompt_text_hi"]
    assert "audio_script_text" in data


def test_artisan_voice_complete_auto_draft_flow(client):
    """
    Step 2 & 3: Artisan responds with voice note describing craft.
    Voice transcribed via STT, extracted via LLM, FairPrice estimated, draft created.
    """
    # First ingest media
    client.post(
        "/internal/whatsapp/media",
        headers=AUTH_HEADER,
        json={"phone": TEST_PHONE, "media_url": "https://example.com/cover.jpg"},
    )

    # Ingest voice note
    voice_payload = {
        "phone": TEST_PHONE,
        "audio_url": "https://example.com/audio/cushion.mp3",
        "language": "hi",
        "stt_provider": "mock",
    }
    response = client.post("/internal/whatsapp/voice", headers=AUTH_HEADER, json=voice_payload)
    assert response.status_code == 200
    data = response.json()

    assert data["step"] == "awaiting_approval"
    assert data["status"] == "draft_created"
    assert data["needs_clarification"] is False
    assert len(data["missing_fields"]) == 0

    # Structured craft details
    extracted = data["extracted_craft"]
    assert extracted["craft"] == "Aari Hand Embroidery"
    assert "Cotton fabric" in extracted["materials"]
    assert "Silk embroidery thread" in extracted["materials"]

    # FairPrice calculation breakdown
    fp = data["fair_price"]
    assert fp["suggested_price"] > 0
    assert fp["artisan_earnings"] > 0
    assert fp["floor_price"] > 0
    assert fp["artisan_earnings"] > fp["material_cost"]  # Living wage guarantee

    # Interactive buttons
    button_ids = [b["id"] for b in data["interactive_buttons"]]
    assert "btn_approve" in button_ids
    assert "btn_edit" in button_ids
    assert "btn_cancel" in button_ids

    # Hindi summary and audio script
    assert "उचित कीमत" in data["hindi_text"]
    assert "ड्राफ्ट" in data["audio_script_text"]


def test_artisan_voice_missing_fields_honesty_rule(client):
    """
    AI Honesty Rule: If essential craft/material fields are missing from transcript,
    Pydantic validation flags them and the service asks a clarification question instead of guessing.
    """
    incomplete_phone = "+919876543299"
    # Ingest media
    client.post(
        "/internal/whatsapp/media",
        headers=AUTH_HEADER,
        json={"phone": incomplete_phone, "media_url": "https://example.com/sample.jpg"},
    )

    # Ingest voice note with missing craft/title (simulated via special test keywords in Mock LLM)
    voice_payload = {
        "phone": incomplete_phone,
        "audio_url": "https://example.com/audio/incomplete_voice.mp3",
        "language": "hi",
        "stt_provider": "mock",
    }
    # MockSttAdapter can be targeted or we test with custom transcript
    from app.adapters.stt import MockSttAdapter
    from app.services.artisan_listing import artisan_listing_service

    orig_stt = artisan_listing_service.stt
    artisan_listing_service.stt = MockSttAdapter(default_transcript="सिर्फ धागा (incomplete)")

    try:
        response = client.post("/internal/whatsapp/voice", headers=AUTH_HEADER, json=voice_payload)
        assert response.status_code == 200
        data = response.json()

        assert data["needs_clarification"] is True
        assert data["step"] == "needs_clarification"
        assert len(data["missing_fields"]) > 0
        assert "craft" in data["missing_fields"] or "title" in data["missing_fields"]
        # Follow-up question generated in Hindi instead of hallucinating values
        assert "बताएं" in data["hindi_text"]
        assert data["draft_id"] is None  # Does not create draft prematurely
    finally:
        artisan_listing_service.stt = orig_stt


def test_coordinator_validation_rule_on_approval(client):
    """
    Coordinator-Validation Rule:
    When artisan approves draft via [Approve & Publish], status MUST transition to 'pending_validation'.
    Publishing to e-commerce strictly requires subsequent human coordinator review.
    Cloudinary GI watermark badge overlay is dynamically applied.
    """
    # 1. Setup draft by running media + voice
    client.post(
        "/internal/whatsapp/media",
        headers=AUTH_HEADER,
        json={"phone": TEST_PHONE, "media_url": "https://example.com/cushion.jpg"},
    )
    v_res = client.post(
        "/internal/whatsapp/voice",
        headers=AUTH_HEADER,
        json={"phone": TEST_PHONE, "language": "hi", "stt_provider": "mock"},
    )
    draft_id = v_res.json()["draft_id"]

    # 2. Artisan clicks [Approve & Publish]
    approve_payload = {
        "phone": TEST_PHONE,
        "button_id": "btn_approve",
        "draft_id": draft_id,
    }
    app_res = client.post("/internal/whatsapp/approve", headers=AUTH_HEADER, json=approve_payload)
    assert app_res.status_code == 200
    data = app_res.json()

    assert data["action_taken"] == "artisan_approved"
    # Mandatory coordinator validation status
    assert data["new_status"] == "pending_validation"
    assert data["requires_coordinator_review"] is True
    # Cloudinary GI watermark badge applied
    assert "l_kalaswar_gi_badge" in data["watermarked_image_url"]
    assert "कोऑर्डिनेटर" in data["hindi_text"]


def test_artisan_edit_and_cancel_buttons(client):
    """Verify edit returns to awaiting_voice and cancel transitions to archived."""
    # Test edit
    res_edit = client.post(
        "/internal/whatsapp/approve",
        headers=AUTH_HEADER,
        json={"phone": TEST_PHONE, "button_id": "btn_edit"},
    )
    assert res_edit.status_code == 200
    assert res_edit.json()["action_taken"] == "artisan_requested_edit"

    # Test cancel
    res_cancel = client.post(
        "/internal/whatsapp/approve",
        headers=AUTH_HEADER,
        json={"phone": TEST_PHONE, "button_id": "btn_cancel"},
    )
    assert res_cancel.status_code == 200
    assert res_cancel.json()["new_status"] == "archived"


def test_get_artisan_session_detail(client):
    """Verify GET /internal/whatsapp/session/{phone} returns state and draft status."""
    response = client.get(f"/internal/whatsapp/session/{TEST_PHONE}", headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()

    assert data["phone"] == TEST_PHONE
    assert "step" in data
    assert "status" in data
    assert "last_activity_at" in data


def test_whatsapp_voice_idempotency_duplicate_delivery(client):
    """
    Idempotency Rule:
    When WhatsApp webhook delivers duplicate voice note calls with the same whatsapp_message_id,
    the endpoint returns the original response instead of creating a second draft.
    """
    import uuid
    from app.services.artisan_listing import _IN_MEMORY_DRAFTS

    msg_phone = "+919876543277"
    msg_id = f"wamid.{uuid.uuid4()}"

    # Setup media first
    client.post(
        "/internal/whatsapp/media",
        headers=AUTH_HEADER,
        json={"phone": msg_phone, "media_url": "https://example.com/item.jpg"},
    )

    initial_draft_count = len(_IN_MEMORY_DRAFTS)

    voice_payload = {
        "phone": msg_phone,
        "audio_url": "https://example.com/audio/sample.mp3",
        "language": "hi",
        "stt_provider": "mock",
        "whatsapp_message_id": msg_id,
        "content_type": "audio/ogg",
    }

    # First delivery
    res1 = client.post("/internal/whatsapp/voice", headers=AUTH_HEADER, json=voice_payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["is_duplicate"] is False
    assert data1["draft_id"] is not None
    first_draft_id = data1["draft_id"]

    draft_count_after_first = len(_IN_MEMORY_DRAFTS)
    assert draft_count_after_first == initial_draft_count + 1

    # Duplicate delivery (network retry / webhook redelivery)
    res2 = client.post("/internal/whatsapp/voice", headers=AUTH_HEADER, json=voice_payload)
    assert res2.status_code == 200
    data2 = res2.json()

    # Must return original response and mark as duplicate
    assert data2["is_duplicate"] is True
    assert data2["draft_id"] == first_draft_id
    assert data2["hindi_text"] == data1["hindi_text"]
    assert data2["whatsapp_message_id"] == msg_id

    # Crucial: No second draft was created
    assert len(_IN_MEMORY_DRAFTS) == draft_count_after_first


def test_whatsapp_media_and_approve_idempotency(client):
    """Verify idempotency for media upload and approve button endpoints."""
    import uuid

    phone = "+919876543288"
    media_msg_id = f"wamid.{uuid.uuid4()}"

    # 1. Media Upload
    media_payload = {
        "phone": phone,
        "media_url": "https://example.com/scarf.jpg",
        "whatsapp_message_id": media_msg_id,
    }
    m1 = client.post("/internal/whatsapp/media", headers=AUTH_HEADER, json=media_payload)
    assert m1.status_code == 200
    assert m1.json()["is_duplicate"] is False

    # Re-send media upload with same message ID
    m2 = client.post("/internal/whatsapp/media", headers=AUTH_HEADER, json=media_payload)
    assert m2.status_code == 200
    assert m2.json()["is_duplicate"] is True
    assert m2.json()["image_url"] == m1.json()["image_url"]

    # 2. Voice step to create draft
    v_res = client.post(
        "/internal/whatsapp/voice",
        headers=AUTH_HEADER,
        json={"phone": phone, "language": "hi", "stt_provider": "mock"},
    )
    draft_id = v_res.json()["draft_id"]

    # 3. Approve Button
    approve_msg_id = f"wamid.{uuid.uuid4()}"
    approve_payload = {
        "phone": phone,
        "button_id": "btn_approve",
        "draft_id": draft_id,
        "whatsapp_message_id": approve_msg_id,
    }
    a1 = client.post("/internal/whatsapp/approve", headers=AUTH_HEADER, json=approve_payload)
    assert a1.status_code == 200
    assert a1.json()["is_duplicate"] is False
    assert a1.json()["new_status"] == "pending_validation"

    # Re-send approval with same message ID
    a2 = client.post("/internal/whatsapp/approve", headers=AUTH_HEADER, json=approve_payload)
    assert a2.status_code == 200
    assert a2.json()["is_duplicate"] is True
    assert a2.json()["new_status"] == "pending_validation"
    assert a2.json()["draft_id"] == draft_id


def test_whatsapp_voice_ogg_opus_input(client):
    """
    OGG / Opus Input Handling:
    WhatsApp sends audio notes as audio/ogg; codecs=opus.
    The voice endpoint must accept audio/ogg base64 input and process it cleanly.
    """
    import base64
    import uuid

    phone = "+919876543266"
    client.post(
        "/internal/whatsapp/media",
        headers=AUTH_HEADER,
        json={"phone": phone, "media_url": "https://example.com/saree.jpg"},
    )

    # Synthetic OGG container binary with Opus magic header
    fake_ogg_bytes = b"OggS\x00\x02" + b"\x00" * 100 + b"OpusHead" + b"\x00" * 50
    ogg_base64 = base64.b64encode(fake_ogg_bytes).decode("utf-8")

    payload = {
        "phone": phone,
        "audio_base64": ogg_base64,
        "language": "hi",
        "stt_provider": "mock",
        "content_type": "audio/ogg",
        "whatsapp_message_id": f"wamid.{uuid.uuid4()}",
    }
    response = client.post("/internal/whatsapp/voice", headers=AUTH_HEADER, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["step"] == "awaiting_approval"
    assert data["status"] == "draft_created"
    assert data["draft_id"] is not None


def test_audio_transcoding_adapter_unit():
    """Unit tests for audio adapter format detection and conversion fallbacks."""
    from app.adapters.audio import convert_audio_to_wav, is_ogg_audio, is_wav_audio

    # OGG header detection
    ogg_data = b"OggS\x00\x02\x00" + b"\x00" * 20
    assert is_ogg_audio(ogg_data) is True
    assert is_wav_audio(ogg_data) is False

    # WAV header detection
    wav_data = b"RIFF\x24\x00\x00\x00WAVEfmt "
    assert is_wav_audio(wav_data) is True
    assert is_ogg_audio(wav_data) is False

    # Non-audio data
    assert is_ogg_audio(b"") is False
    assert is_wav_audio(b"") is False

    # Conversion of WAV data should return data as-is without invoking ffmpeg
    wav_passthrough = convert_audio_to_wav(wav_data, source_format="wav")
    assert wav_passthrough == wav_data

    # Conversion with invalid ffmpeg path gracefully returns original bytes
    res = convert_audio_to_wav(ogg_data, source_format="ogg", ffmpeg_binary="/nonexistent/ffmpeg")
    assert res == ogg_data

