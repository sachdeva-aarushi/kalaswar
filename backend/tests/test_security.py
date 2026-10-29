def test_unauthenticated_request_rejected(client):
    """Verify endpoint without Authorization header returns 401 with standard error format."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "UNAUTHORIZED"
    assert data["error"]["status_code"] == 401
    assert "request_id" in data["error"]
    assert "X-Request-ID" in response.headers


def test_malformed_authorization_header(client):
    """Verify malformed authorization headers return 401."""
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Basic 12345"})
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "UNAUTHORIZED"

    response = client.get("/api/v1/auth/me", headers={"Authorization": "BearerOnly"})
    assert response.status_code == 401


def test_expired_token_rejected(client, generate_user):
    """Verify expired JWT token returns 401."""
    expired_user = generate_user(role="customer", expired=True)
    response = client.get("/api/v1/auth/me", headers=expired_user["headers"])
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "UNAUTHORIZED"
    assert "expired" in data["error"]["message"].lower()


def test_invalid_signature_rejected(client):
    """Verify garbage/tampered token returns 401."""
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.fake.token"})
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_authenticated_user_profile(client, customer_headers):
    """Verify valid token retrieves user profile with roles."""
    response = client.get("/api/v1/auth/me", headers=customer_headers)
    assert response.status_code == 200
    data = response.json()
    assert "user_id" in data
    assert "email" in data
    assert "customer" in data["roles"]


def test_role_guard_admin(client, admin_headers, customer_headers, artisan_headers):
    """Verify strictly admins can access /auth/admin-only."""
    # Allowed
    res_admin = client.get("/api/v1/auth/admin-only", headers=admin_headers)
    assert res_admin.status_code == 200
    assert res_admin.json()["access"] == "granted"

    # Forbidden for customer
    res_customer = client.get("/api/v1/auth/admin-only", headers=customer_headers)
    assert res_customer.status_code == 403
    assert res_customer.json()["error"]["code"] == "FORBIDDEN"

    # Forbidden for artisan
    res_artisan = client.get("/api/v1/auth/admin-only", headers=artisan_headers)
    assert res_artisan.status_code == 403
    assert res_artisan.json()["error"]["code"] == "FORBIDDEN"


def test_role_guard_coordinator(client, coordinator_headers, artisan_headers):
    """Verify coordinator endpoints allow coordinators and deny others."""
    res_coord = client.get("/api/v1/auth/coordinator-only", headers=coordinator_headers)
    assert res_coord.status_code == 200
    assert res_coord.json()["access"] == "granted"

    res_artisan = client.get("/api/v1/auth/coordinator-only", headers=artisan_headers)
    assert res_artisan.status_code == 403
    assert res_artisan.json()["error"]["code"] == "FORBIDDEN"


def test_role_guard_artisan(client, artisan_headers, customer_headers):
    """Verify artisan endpoint allows artisans and denies customers."""
    res_artisan = client.get("/api/v1/auth/artisan-only", headers=artisan_headers)
    assert res_artisan.status_code == 200
    assert res_artisan.json()["access"] == "granted"

    res_customer = client.get("/api/v1/auth/artisan-only", headers=customer_headers)
    assert res_customer.status_code == 403
    assert res_customer.json()["error"]["code"] == "FORBIDDEN"


def test_role_guard_financier(client, financier_headers, buyer_headers):
    """Verify financier endpoint allows financiers and denies buyers."""
    res_fin = client.get("/api/v1/auth/financier-only", headers=financier_headers)
    assert res_fin.status_code == 200
    assert res_fin.json()["access"] == "granted"

    res_buyer = client.get("/api/v1/auth/financier-only", headers=buyer_headers)
    assert res_buyer.status_code == 403
    assert res_buyer.json()["error"]["code"] == "FORBIDDEN"
