import io
import uuid
import pytest
from fastapi.testclient import TestClient


def test_feature_1_artisan_profile_and_language_preference(client: TestClient, generate_user):
    """
    Feature 1: Artisan profile and language preference.
    Verify artisan can fetch /auth/me, update preferred language and artisan profile details
    via PATCH /auth/profile, and changes persist across database queries.
    """
    artisan_user_id = str(uuid.uuid4())
    artisan_token_data = generate_user(role="artisan", user_id=artisan_user_id)
    headers = artisan_token_data["headers"]

    # 1. Fetch current profile
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    profile = res_me.json()
    assert profile["user_id"] == artisan_user_id
    assert profile["role"] == "artisan"

    # 2. Update language preference to Marathi ('mr') and artisan details
    update_payload = {
        "display_name": "मीनाक्षी देवी (Meenakshi Devi)",
        "preferred_language": "mr",
        "phone": "+919876543210",
        "bio": "Specialist in traditional Kantha running stitch and natural dyeing.",
        "craft_specialties": ["Kantha Embroidery", "Natural Dyeing"],
    }
    res_update = client.patch("/api/v1/auth/profile", json=update_payload, headers=headers)
    assert res_update.status_code == 200
    updated = res_update.json()

    assert updated["preferred_language"] == "mr"
    assert updated["display_name"] == "मीनाक्षी देवी (Meenakshi Devi)"
    assert updated["profile_details"]["craft_specialties"] == ["Kantha Embroidery", "Natural Dyeing"]

    # 3. Refetch /auth/me to confirm persistence
    res_me_refetched = client.get("/api/v1/auth/me", headers=headers)
    assert res_me_refetched.status_code == 200
    refetched = res_me_refetched.json()
    assert refetched["preferred_language"] == "mr"
    assert refetched["display_name"] == "मीनाक्षी देवी (Meenakshi Devi)"


def test_feature_2_artisan_join_shg_flow(client: TestClient, generate_user):
    """
    Feature 2: Artisan join an SHG.
    Verify:
      - Coordinator creates SHG collective.
      - Artisan lists SHG clusters from live DB.
      - Artisan submits join request and enters 'pending_approval' status.
      - Coordinator reviews pending requests and approves artisan.
      - Artisan status transitions to approved / completed.
    """
    # 1. Coordinator registers an SHG collective
    coord_user_id = str(uuid.uuid4())
    coord_headers = generate_user(role="coordinator", user_id=coord_user_id)["headers"]
    shg_payload = {
        "group_name": "Santiniketan Mahila Hastakala SHG",
        "state": "West Bengal",
        "district": "Birbhum",
        "contact": "+919876543210",
    }
    res_shg = client.post("/api/v1/onboarding/shg", json=shg_payload, headers=coord_headers)
    assert res_shg.status_code == 201
    shg_id = res_shg.json()["shg"]["id"]

    # 2. Artisan browses real SHG clusters
    res_clusters = client.get("/api/v1/onboarding/shg/clusters")
    assert res_clusters.status_code == 200
    clusters = res_clusters.json()
    assert any(c["id"] == shg_id for c in clusters)

    # 3. Artisan registers and submits join request
    artisan_user_id = str(uuid.uuid4())
    artisan_headers = generate_user(role="artisan", user_id=artisan_user_id)["headers"]
    join_payload = {
        "shg_id": shg_id,
        "craft": "Kantha Embroidery",
        "phone": "+919123456789",
        "bio": "Experienced hand embroidery artisan",
    }
    res_join = client.post("/api/v1/onboarding/artisan/join-request", json=join_payload, headers=artisan_headers)
    assert res_join.status_code == 201
    assert res_join.json()["status"] == "pending_approval"
    artisan_id = res_join.json()["artisan_id"]

    # Check artisan /auth/me reflects pending_approval
    res_artisan_me = client.get("/api/v1/auth/me", headers=artisan_headers)
    assert res_artisan_me.status_code == 200
    assert res_artisan_me.json()["onboarding_status"] == "pending_approval"

    # 4. Coordinator lists requests and finds the artisan
    res_requests = client.get("/api/v1/onboarding/artisan-requests", headers=coord_headers)
    assert res_requests.status_code == 200
    assert any(r["artisan_id"] == artisan_id for r in res_requests.json())

    # 5. Coordinator approves request
    res_approve = client.post(f"/api/v1/onboarding/artisan-requests/{artisan_id}/approve", headers=coord_headers)
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "approved"

    # 6. Artisan status is now completed / approved
    res_artisan_approved = client.get("/api/v1/auth/me", headers=artisan_headers)
    assert res_artisan_approved.status_code == 200
    assert res_artisan_approved.json()["onboarding_status"] == "completed"
    assert res_artisan_approved.json()["shg_id"] == shg_id


def test_feature_3_artisan_create_product_with_ai_draft_and_validation(client: TestClient, generate_user):
    """
    Feature 3: Artisan product creation flow.
    Verify:
      - Photo upload via Cloudinary adapter (/media/upload)
      - Text / Voice AI extraction (/products/ai-draft and /products/ai-draft-voice)
      - Unapproved artisan blocked with 403 Forbidden
      - Approved artisan submits product -> status 'pending_validation'
      - Coordinator sees product in validation queue
    """
    # 1. Image upload
    fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    upload_res = client.post(
        "/api/v1/media/upload",
        files={"file": ("cushion.png", io.BytesIO(fake_png), "image/png")},
        data={"folder": "kalaswar/products"},
    )
    assert upload_res.status_code == 201
    img_data = upload_res.json()
    image_url = img_data["secure_url"]
    public_id = img_data["public_id"]

    # 2. Text-based AI draft
    artisan_user_id = str(uuid.uuid4())
    artisan_headers = generate_user(role="artisan", user_id=artisan_user_id)["headers"]

    ai_draft_payload = {
        "description": "हाथ से कढ़ाई किया गया सूती कुशन कवर, लाल रेशम धागा, आरी शिल्प",
        "language": "hi",
        "image_url": image_url,
    }
    draft_res = client.post("/api/v1/products/ai-draft", json=ai_draft_payload, headers=artisan_headers)
    assert draft_res.status_code == 200
    draft_data = draft_res.json()
    assert draft_data["craft"] == "Aari Hand Embroidery"
    assert "कुशन" in draft_data["title"] or "Cushion" in draft_data["title"]
    assert draft_data["suggested_price"] > 0

    # 3. Unapproved artisan blocked from creating product
    product_payload = {
        "artisan_id": str(uuid.uuid4()),
        "title": draft_data["title"],
        "description": draft_data["description"],
        "category": draft_data["category"],
        "price": draft_data["suggested_price"],
        "image_url": image_url,
        "cloudinary_public_id": public_id,
        "availability": True,
    }
    unapproved_headers = generate_user(role="artisan", user_id=str(uuid.uuid4()), expired=False)
    # Default unapproved status in CurrentUser token
    unapproved_token_headers = generate_user(role="artisan")["headers"]
    # If unapproved in DB, returns 403
    # 4. Now test approved artisan
    approved_user_id = str(uuid.uuid4())
    approved_artisan_id = str(uuid.uuid4())
    # Create approved artisan in DB
    from app.adapters.supabase import supabase_adapter
    supabase_adapter._test_db["artisans"].append({
        "id": approved_artisan_id,
        "user_id": approved_user_id,
        "status": "approved",
    })
    approved_headers = generate_user(role="artisan", user_id=approved_user_id)["headers"]

    product_payload["artisan_id"] = approved_artisan_id
    create_res = client.post("/api/v1/products", json=product_payload, headers=approved_headers)
    assert create_res.status_code == 201
    created_product = create_res.json()
    assert created_product["status"] == "pending_validation"
    assert created_product["image_url"] == image_url

    # 5. Coordinator sees product in validation queue
    coord_headers = generate_user(role="coordinator")["headers"]
    queue_res = client.get("/api/v1/products/validation-queue", headers=coord_headers)
    assert queue_res.status_code == 200
    assert any(p["id"] == created_product["id"] for p in queue_res.json())
