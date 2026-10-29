def test_not_found_standard_error_envelope(client):
    """Verify 404 responses conform strictly to the standardized error schema."""
    response = client.get("/api/v1/non-existent-route-xyz")
    assert response.status_code == 404
    data = response.json()

    assert "error" in data
    error = data["error"]
    assert error["code"] == "NOT_FOUND"
    assert error["status_code"] == 404
    assert "message" in error
    assert "request_id" in error
    assert error["request_id"] == response.headers.get("X-Request-ID")


def test_validation_error_standard_envelope(client, customer_headers):
    """Verify 422 validation errors adhere strictly to the error schema with details."""
    # Send invalid body to /api/v1/audit/logs (missing action and entity)
    response = client.post(
        "/api/v1/audit/logs",
        headers=customer_headers,
        json={"invalid_field": 123},
    )
    assert response.status_code == 422
    data = response.json()

    assert "error" in data
    error = data["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["status_code"] == 422
    assert "message" in error
    assert "details" in error
    assert isinstance(error["details"], list)
    assert error["request_id"] == response.headers.get("X-Request-ID")


def test_error_envelope_consistency(client):
    """Verify all HTTP error codes provide identical envelope shape."""
    # 404
    r404 = client.get("/invalid-url").json()
    assert set(r404.keys()) == {"error"}
    assert {"code", "message", "status_code", "request_id", "details"}.issubset(r404["error"].keys())

    # 401
    r401 = client.get("/api/v1/auth/me").json()
    assert set(r401.keys()) == {"error"}
    assert {"code", "message", "status_code", "request_id", "details"}.issubset(r401["error"].keys())
