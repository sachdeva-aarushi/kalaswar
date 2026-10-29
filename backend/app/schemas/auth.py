from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class CurrentUser(BaseModel):
    id: UUID
    email: Optional[str] = None
    roles: List[str] = Field(default_factory=lambda: ["customer"])
    aud: Optional[str] = "authenticated"
    user_metadata: Dict[str, Any] = Field(default_factory=dict)
    app_metadata: Dict[str, Any] = Field(default_factory=dict)

    def has_role(self, role: str) -> bool:
        return role.lower() in [r.lower() for r in self.roles]

    def has_any_role(self, roles: List[str]) -> bool:
        allowed = [r.lower() for r in roles]
        return any(r.lower() in allowed for r in self.roles)


class UserProfileResponse(BaseModel):
    user_id: UUID
    email: Optional[str] = None
    roles: List[str]
    display_name: Optional[str] = None
    preferred_language: str = "en"
