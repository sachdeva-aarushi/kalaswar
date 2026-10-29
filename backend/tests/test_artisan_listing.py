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
