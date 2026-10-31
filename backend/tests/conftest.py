import os
import sys
import uuid
import pytest

os.environ["APP_ENV"] = "test"
os.environ["ENVIRONMENT"] = "test"

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.core.config import settings
from app.core.security import create_test_token
from app.main import app
from app.adapters.supabase import supabase_adapter


@pytest.fixture(scope="session", autouse=True)
def configure_test_settings():
    """Sets deterministic test configuration."""
    settings.ENVIRONMENT = "test"
    settings.SUPABASE_JWT_SECRET = "kalaswar_test_jwt_secret_must_be_32_bytes_long_min"


@pytest.fixture
def client():
    """Provides a synchronous FastAPI TestClient instance."""
    with TestClient(app, base_url="http://testserver") as c:
        yield c


@pytest.fixture
def generate_user():
    """Factory fixture to create test JWT tokens and headers for any role."""
    def _create(role: str = "customer", user_id: str = None, email: str = None, expired: bool = False):
        uid = user_id or str(uuid.uuid4())
        user_email = email or f"{role}_{uid[:6]}@kalaswar.org"
        token = create_test_token(
            user_id=uid,
            email=user_email,
            roles=[role],
            expired=expired,
        )
        return {
            "user_id": uid,
            "email": user_email,
            "role": role,
            "token": token,
            "headers": {"Authorization": f"Bearer {token}"},
        }
    return _create


@pytest.fixture
def admin_headers(generate_user):
    return generate_user(role="admin")["headers"]


@pytest.fixture
def coordinator_headers(generate_user):
    return generate_user(role="coordinator")["headers"]


@pytest.fixture
def artisan_headers(generate_user):
    return generate_user(role="artisan")["headers"]


@pytest.fixture
def financier_headers(generate_user):
    return generate_user(role="financier")["headers"]


@pytest.fixture
def customer_headers(generate_user):
    return generate_user(role="customer")["headers"]


@pytest.fixture
def buyer_headers(generate_user):
    return generate_user(role="buyer")["headers"]
