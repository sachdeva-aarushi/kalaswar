def test_root_health_endpoint(client):
    """Verify /health returns 200 with service metadata and request ID."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert "version" in data
    assert "environment" in data
    assert "database_connected" in data
    assert "X-Request-ID" in response.headers
    assert response.headers["X-Request-ID"].startswith("req_")


def test_api_v1_health_endpoint(client):
    """Verify /api/v1/health also returns 200 with health details."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_root_discovery_endpoint(client):
    """Verify root endpoint exposes discovery metadata and docs URL."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["docs_url"] == "/docs"
    assert data["openapi_url"] == "/openapi.json"
    assert data["health"] == "/health"


def test_custom_request_id_propagation(client):
    """Verify custom X-Request-ID header is propagated back in response."""
    custom_id = "test-req-custom-998877"
    response = client.get("/health", headers={"X-Request-ID": custom_id})
    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == custom_id
