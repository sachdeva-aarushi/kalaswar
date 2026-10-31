import io
import pytest
from app.core.config import settings
from app.core.startup_checks import verify_production_credentials_on_startup
from app.adapters.cloudinary import FALLBACK_SVG_DATA_URL


def test_media_sign_endpoint(client):
    """Verify POST /api/v1/media/sign returns signed upload parameters with f_auto,q_auto."""
    res = client.post("/api/v1/media/sign?folder=kalaswar/test_uploads")
    assert res.status_code == 200
    data = res.json()
    assert "upload_url" in data
    assert "signature" in data
    assert "timestamp" in data
    assert data["transformation"] == "f_auto,q_auto"
    assert data["folder"] == "kalaswar/test_uploads"


def test_media_upload_endpoint_success(client):
    """Verify POST /api/v1/media/upload succeeds with image bytes."""
    fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    files = {"file": ("test_sample.png", io.BytesIO(fake_png), "image/png")}
    data = {"folder": "kalaswar/products", "background_clean": "false"}
    res = client.post("/api/v1/media/upload", files=files, data=data)
    assert res.status_code == 201
    resp_data = res.json()
    assert resp_data["status"] == "success"
    assert "url" in resp_data
    assert "public_id" in resp_data
    assert resp_data["format"] == "webp"


def test_media_upload_invalid_file_type(client):
    """Verify POST /api/v1/media/upload rejects non-image files."""
    files = {"file": ("notes.txt", io.BytesIO(b"Hello world"), "text/plain")}
    res = client.post("/api/v1/media/upload", files=files)
    assert res.status_code == 400
    assert "Invalid file type" in res.json()["error"]["message"]


def test_media_fallback_endpoint(client):
    """Verify GET /api/v1/media/fallback returns standard SVG fallback."""
    res = client.get("/api/v1/media/fallback")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["fallback_url"] == FALLBACK_SVG_DATA_URL


def test_startup_check_in_test_mode():
    """In test mode (APP_ENV=test), startup check succeeds even without production keys."""
    # Since pytest runs with ENVIRONMENT=test, settings.is_test is True
    assert settings.is_test is True
    # Should not raise
    verify_production_credentials_on_startup()


def test_startup_check_refuses_in_production(monkeypatch):
    """Outside test mode, startup check raises RuntimeError if keys are missing."""
    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "CLOUDINARY_CLOUD_NAME", "")
    monkeypatch.setattr(settings, "CLOUDINARY_API_KEY", "")
    monkeypatch.setattr(settings, "CLOUDINARY_API_SECRET", "")
    monkeypatch.setattr(settings, "SARVAM_API_KEY", "")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    assert settings.is_test is False

    with pytest.raises(RuntimeError) as exc_info:
        verify_production_credentials_on_startup()

    assert "CRITICAL STARTUP FAILURE" in str(exc_info.value)
    assert "CLOUDINARY_CLOUD_NAME" in str(exc_info.value)
    assert "SPEECH_TO_TEXT" in str(exc_info.value)
    assert "LLM" in str(exc_info.value)


def test_empty_catalog_returns_empty_list(client):
    """Verify /api/v1/products returns empty list with zero mock fallback when no matching products exist."""
    res = client.get("/api/v1/products?artisan_id=00000000-0000-0000-0000-000000000000")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data["items"], list)
    assert data["total"] == 0
    assert data["items"] == []
