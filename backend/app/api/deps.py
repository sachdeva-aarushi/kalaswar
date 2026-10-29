from typing import Callable, List
from fastapi import Depends, Header
from app.adapters.supabase import SupabaseAdapter, supabase_adapter
from app.core.errors import AuthError, ForbiddenError
from app.core.security import parse_current_user
from app.schemas.auth import CurrentUser
from app.services.audit import AuditService, audit_service


async def get_current_user(authorization: str = Header(None, alias="Authorization")) -> CurrentUser:
    """Dependency verifying Supabase Bearer JWT and returning CurrentUser."""
    if not authorization:
        raise AuthError("Missing Authorization header")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AuthError("Invalid authorization format. Must be 'Bearer <token>'")

    token = parts[1].strip()
    return parse_current_user(token)


def require_role(required_role: str) -> Callable[[CurrentUser], CurrentUser]:
    """Dependency guard enforcing that the current user possesses a specific role."""
    async def role_guard(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not current_user.has_role(required_role):
            raise ForbiddenError(
                f"Action requires '{required_role}' role. Current user roles: {current_user.roles}"
            )
        return current_user

    return role_guard


def require_roles(allowed_roles: List[str]) -> Callable[[CurrentUser], CurrentUser]:
    """Dependency guard enforcing that the current user possesses at least one of the allowed roles."""
    async def roles_guard(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not current_user.has_any_role(allowed_roles):
            raise ForbiddenError(
                f"Action requires one of roles {allowed_roles}. Current user roles: {current_user.roles}"
            )
        return current_user

    return roles_guard


def get_audit() -> AuditService:
    return audit_service


def get_supabase() -> SupabaseAdapter:
    return supabase_adapter
