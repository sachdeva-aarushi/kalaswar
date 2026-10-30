import uuid
import pytest
from fastapi.testclient import TestClient
from app.core.rate_limit import auth_rate_limiter
from app.core.security import create_test_token


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Resets in-memory rate limiter buckets before each test."""
    auth_rate_limiter.reset()
    yield
    auth_rate_limiter.reset()


# -----------------------------------------------------------------------------
# 1. Signup For Each of the 4 User Types (Role set server-side)
# -----------------------------------------------------------------------------

def test_signup_customer(client: TestClient):
    """Customer signup creates account with role='customer' and onboarding_status='completed'."""
    payload = {
        "email": f"cust_{uuid.uuid4().hex[:6]}@example.com",
        "password": "Password123!",
        "full_name": "Rohan Mehra",
        "preferred_language": "en",
    }
    res = client.post("/api/v1/auth/signup/customer", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["role"] == "customer"
    assert data["onboarding_status"] == "completed"
    assert "access_token" in data
    assert data["email"] == payload["email"]


def test_signup_buyer_valid_gstin(client: TestClient):
    """B2B buyer signup with valid Indian 15-character GSTIN succeeds with role='buyer'."""
    payload = {
        "email": f"buyer_{uuid.uuid4().hex[:6]}@corp.in",
        "password": "Password123!",
        "full_name": "Vikram Sethi",
        "company_name": "Sethi Crafts Ltd",
        "gstin": "27AABCU9603R1ZN",  # Valid 15-character Indian GSTIN
        "contact_phone": "9876543210",
        "preferred_language": "en",
    }
    res = client.post("/api/v1/auth/signup/buyer", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["role"] == "buyer"
    assert data["onboarding_status"] == "completed"


def test_signup_buyer_invalid_gstin_rejected(client: TestClient):
    """B2B buyer signup with invalid GSTIN format is rejected with 422 Unprocessable Entity."""
    payload = {
        "email": f"buyer_{uuid.uuid4().hex[:6]}@corp.in",
        "password": "Password123!",
        "full_name": "Vikram Sethi",
        "company_name": "Sethi Crafts Ltd",
        "gstin": "INVALID_GSTIN_123",  # Malformed GSTIN
        "contact_phone": "9876543210",
        "preferred_language": "en",
    }
    res = client.post("/api/v1/auth/signup/buyer", json=payload)
    assert res.status_code == 422


def test_signup_artisan(client: TestClient):
    """Artisan signup creates account with role='artisan' and onboarding_status='pending_approval'."""
    shg_id = str(uuid.uuid4())
    payload = {
        "email": f"artisan_{uuid.uuid4().hex[:6]}@craft.org",
        "password": "Password123!",
        "full_name": "Geeta Bai",
        "phone": "9811223344",
        "craft": "Aari Embroidery",
        "shg_id": shg_id,
        "preferred_language": "hi",
    }
    res = client.post("/api/v1/auth/signup/artisan", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["role"] == "artisan"
    assert data["onboarding_status"] == "pending_approval"


def test_signup_shg_coordinator(client: TestClient):
    """SHG Coordinator signup creates collective with role='coordinator' and onboarding_status='completed'."""
    payload = {
        "email": f"coord_{uuid.uuid4().hex[:6]}@shg.org",
        "password": "Password123!",
        "full_name": "Kavita Didi",
        "group_name": "Kalyani Mahila Mandal",
        "state": "Maharashtra",
        "district": "Pune",
        "block": "Haveli",
        "srlm_id": "MH-PUN-2024-9988",
        "contact_phone": "9822334455",
        "preferred_language": "mr",
    }
    res = client.post("/api/v1/auth/signup/shg", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["role"] == "coordinator"
    assert data["onboarding_status"] == "completed"


def test_nobody_can_self_register_as_admin(client: TestClient):
    """Unified signup strictly rejects any attempt to self-register as 'admin'."""
    payload = {
        "role": "admin",  # Invalid role
        "email": "hacker@evil.org",
        "password": "Password123!",
        "full_name": "Fake Admin",
    }
    res = client.post("/api/v1/auth/signup", json=payload)
    assert res.status_code in (400, 422)


# -----------------------------------------------------------------------------
# 2. Forbidden Cross-Role Access Returns 403
# -----------------------------------------------------------------------------

def test_forbidden_cross_role_access(
    client: TestClient,
    customer_headers: dict,
    artisan_headers: dict,
    buyer_headers: dict,
    coordinator_headers: dict,
):
    """
    Audit cross-role boundaries:
    - Customer cannot reach /artisan-only, /coordinator-only, or /buyer-only
    - Artisan cannot reach /coordinator-only, /buyer-only
    - Buyer cannot reach /coordinator-only, /artisan-only
    - All forbidden requests receive HTTP 403
    """
    # Customer forbidden checks
    assert client.get("/api/v1/auth/artisan-only", headers=customer_headers).status_code == 403
    assert client.get("/api/v1/auth/coordinator-only", headers=customer_headers).status_code == 403
    assert client.get("/api/v1/auth/buyer-only", headers=customer_headers).status_code == 403

    # Artisan forbidden checks
    assert client.get("/api/v1/auth/coordinator-only", headers=artisan_headers).status_code == 403
    assert client.get("/api/v1/auth/buyer-only", headers=artisan_headers).status_code == 403

    # Buyer forbidden checks
    assert client.get("/api/v1/auth/coordinator-only", headers=buyer_headers).status_code == 403
    assert client.get("/api/v1/auth/artisan-only", headers=buyer_headers).status_code == 403

    # Coordinator cannot reach /buyer-only
    assert client.get("/api/v1/auth/buyer-only", headers=coordinator_headers).status_code == 403


# -----------------------------------------------------------------------------
# 3. GET /me Returning Role, Profile, and Onboarding Status
# -----------------------------------------------------------------------------

def test_get_me_returns_profile_and_status(client: TestClient, generate_user):
    """GET /me returns user_id, email, primary role, roles list, and onboarding_status."""
    user = generate_user(role="artisan")
    res = client.get("/api/v1/auth/me", headers=user["headers"])
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "artisan"
    assert "artisan" in data["roles"]
    assert "onboarding_status" in data
    assert data["user_id"] == user["user_id"]
    assert data["email"] == user["email"]


# -----------------------------------------------------------------------------
# 4. SHG Approves an Artisan & Gating on Product Publishing
# -----------------------------------------------------------------------------

def test_shg_approves_artisan_and_unapproved_artisan_blocked_from_publishing(
    client: TestClient,
    generate_user,
):
    """
    Full workflow:
    1. Coordinator creates/registers SHG collective
    2. Artisan registers and submits join request
    3. Unapproved artisan attempts to publish product -> BLOCKED with 403 Forbidden
    4. Coordinator views pending requests
    5. Coordinator approves artisan
    6. Approved artisan now CAN publish product
    """
    coord_user = generate_user(role="coordinator")
    artisan_user = generate_user(role="artisan")

    # 1. Coordinator registers collective
    shg_reg = client.post(
        "/api/v1/onboarding/shg",
        headers=coord_user["headers"],
        json={
            "group_name": "Sundarban Mahila Samiti",
            "state": "West Bengal",
            "district": "South 24 Parganas",
            "contact": "9833445566",
        },
    )
    assert shg_reg.status_code == 201
    shg_id = shg_reg.json()["shg"]["id"]

    # 2. Artisan submits join request to the collective
    join_res = client.post(
        "/api/v1/onboarding/artisan/join-request",
        headers=artisan_user["headers"],
        json={
            "shg_id": shg_id,
            "craft": "Kantha Embroidery",
            "phone": "9811223399",
            "bio": "Specialist in fine Kantha stitch.",
        },
    )
    assert join_res.status_code == 201
    artisan_id = join_res.json()["artisan_id"]

    # 3. Unapproved artisan attempts to publish product -> MUST RETURN 403 FORBIDDEN
    # Token has default onboarding_status != completed, or artisan table is pending
    unapproved_artisan_token = generate_user(role="artisan")
    # Simulate unapproved status in header
    unapproved_headers = client.post(
        "/api/v1/auth/signup/artisan",
        json={
            "email": f"unapproved_{uuid.uuid4().hex[:6]}@artisan.in",
            "password": "Password123!",
            "full_name": "Unapproved Artisan",
            "phone": "9899001122",
            "craft": "Pottery",
            "shg_id": shg_id,
        },
    ).json()["access_token"]

    blocked_res = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {unapproved_headers}"},
        json={
            "artisan_id": str(uuid.uuid4()),
            "title": "Unapproved Clay Vase",
            "category": "Pottery & Terracotta",
            "price": 850.0,
            "availability": True,
        },
    )
    assert blocked_res.status_code == 403
    err_msg = blocked_res.json().get("detail") or blocked_res.json().get("error", {}).get("message", "")
    assert "Unapproved artisans cannot publish" in err_msg

    # 4. Coordinator lists pending requests and finds the artisan
    requests_res = client.get("/api/v1/onboarding/artisan-requests", headers=coord_user["headers"])
    assert requests_res.status_code == 200
    req_items = requests_res.json()
    assert any(str(r["artisan_id"]) == str(artisan_id) for r in req_items)

    # 5. Coordinator approves the artisan
    approve_res = client.post(
        f"/api/v1/onboarding/artisan-requests/{artisan_id}/approve",
        headers=coord_user["headers"],
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"

    # 6. Approved artisan now CAN successfully create product listing
    approved_token = create_test_token(
        user_id=artisan_user["user_id"],
        email=artisan_user["email"],
        roles=["artisan"],
        onboarding_status="completed",
    )
    pub_res = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {approved_token}"},
        json={
            "artisan_id": str(artisan_id),
            "title": "Approved Kantha Silk Scarf",
            "category": "Textiles & Apparel",
            "price": 1250.0,
            "availability": True,
        },
    )
    assert pub_res.status_code == 201
    assert pub_res.json()["title"] == "Approved Kantha Silk Scarf"


# -----------------------------------------------------------------------------
# 5. Rate Limiting on Auth Endpoints
# -----------------------------------------------------------------------------

def test_auth_rate_limiting_triggers_429(client: TestClient):
    """
    Submitting more than 15 authentication requests per minute from the same IP
    triggers HTTP 429 Too Many Requests with Retry-After header.
    """
    payload = {
        "email": "ratelimit_test@example.com",
    }
    # Send 15 requests (within quota)
    for _ in range(15):
        res = client.post("/api/v1/auth/forgot-password", json=payload)
        assert res.status_code == 200

    # 16th request must trigger HTTP 429
    res_429 = client.post("/api/v1/auth/forgot-password", json=payload)
    assert res_429.status_code == 429
    assert res_429.headers.get("Retry-After") == "60"
    err_429 = res_429.json().get("detail") or res_429.json().get("error", {}).get("message", "")
    assert "Too many requests" in err_429

