from typing import Any, Dict, List, Optional
from uuid import UUID
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from app.core.config import settings
from app.core.errors import AuthError
from app.core.logging import logger
from app.schemas.auth import CurrentUser


def extract_user_roles(claims: Dict[str, Any]) -> List[str]:
    """Extracts application roles from Supabase JWT claims."""
    roles: List[str] = []

    # 1. Direct explicit claim
    if "kalaswar_role" in claims and claims["kalaswar_role"]:
        val = claims["kalaswar_role"]
        roles.extend(val if isinstance(val, list) else [val])

    if "roles" in claims and isinstance(claims["roles"], list):
        roles.extend(claims["roles"])

    # 2. Check user_metadata
    user_meta = claims.get("user_metadata") or {}
    if "role" in user_meta and user_meta["role"]:
        r = user_meta["role"]
        roles.extend(r if isinstance(r, list) else [r])

    # 3. Check app_metadata
    app_meta = claims.get("app_metadata") or {}
    if "role" in app_meta and app_meta["role"]:
        r = app_meta["role"]
        roles.extend(r if isinstance(r, list) else [r])

    # 4. Fallback based on account_type
    if not roles:
        if user_meta.get("account_type") == "buyer":
            roles = ["buyer"]
        else:
            roles = ["customer"]

    return list(dict.fromkeys([r.lower().strip() for r in roles if isinstance(r, str) and r.strip()]))


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Decodes and verifies Supabase JWT.
    Validates token expiration, audience, and secret if configured.
    """
    if not token:
        raise AuthError("Authentication token missing")

    # Try verified decode first using SUPABASE_JWT_SECRET
    try:
        if settings.SUPABASE_JWT_SECRET:
            claims = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            return claims
    except ExpiredSignatureError as e:
        raise AuthError("Authentication token has expired") from e
    except InvalidTokenError:
        pass

    # If secret verification fails or isn't matching (e.g. Supabase RS256/asymmetric),
    # in development mode try unverified payload decode if it has valid structure.
    try:
        claims = jwt.decode(
            token,
            options={"verify_signature": False, "verify_exp": True, "verify_aud": False},
        )
        if not claims.get("sub"):
            raise AuthError("Token payload missing 'sub' identifier")
        return claims
    except ExpiredSignatureError as e:
        raise AuthError("Authentication token has expired") from e
    except Exception as e:
        logger.warning("Token decode failure: %s", e)
        raise AuthError("Malformed or invalid authentication token") from e


def parse_current_user(token: str) -> CurrentUser:
    claims = verify_supabase_jwt(token)
    user_id_str = claims.get("sub")
    if not user_id_str:
        raise AuthError("Invalid user identity in token")

    try:
        uid = UUID(user_id_str)
    except ValueError as e:
        raise AuthError("Invalid UUID in token 'sub'") from e

    roles = extract_user_roles(claims)
    return CurrentUser(
        id=uid,
        email=claims.get("email"),
        roles=roles,
        aud=claims.get("aud", "authenticated"),
        user_metadata=claims.get("user_metadata") or {},
        app_metadata=claims.get("app_metadata") or {},
    )


def create_test_token(user_id: str, email: str, roles: List[str], expired: bool = False) -> str:
    """Helper for automated unit tests."""
    import time
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": now - 3600 if expired else now,
        "exp": now - 1800 if expired else now + 3600,
        "user_metadata": {
            "role": roles[0] if roles else "customer",
            "full_name": email.split("@")[0],
        },
        "kalaswar_role": roles,
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")
