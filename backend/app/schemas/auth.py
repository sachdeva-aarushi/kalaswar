import re
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator

# Indian GSTIN format: 2 digits + 10-char PAN + 1 entity code + 'Z' + 1 checksum
GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")


def validate_gstin_format(v: str) -> str:
    clean = v.strip().upper()
    if not GSTIN_REGEX.match(clean):
        raise ValueError(
            f"Invalid GSTIN format '{v}'. Must be exactly 15 characters (e.g., 27AAPFU0939F1ZV)."
        )
    return clean


class CurrentUser(BaseModel):
    id: UUID
    email: Optional[str] = None
    roles: List[str] = Field(default_factory=lambda: ["customer"])
    onboarding_status: str = "completed"
    aud: Optional[str] = "authenticated"
    user_metadata: Dict[str, Any] = Field(default_factory=dict)
    app_metadata: Dict[str, Any] = Field(default_factory=dict)

    @property
    def primary_role(self) -> str:
        for r in ["coordinator", "artisan", "buyer", "customer"]:
            if r in self.roles:
                return r
        return self.roles[0] if self.roles else "customer"

    def has_role(self, role: str) -> bool:
        return role.lower() in [r.lower() for r in self.roles]

    def has_any_role(self, roles: List[str]) -> bool:
        allowed = [r.lower() for r in roles]
        return any(r.lower() in allowed for r in self.roles)


class UserProfileResponse(BaseModel):
    user_id: UUID
    email: Optional[str] = None
    role: str = "customer"
    roles: List[str] = Field(default_factory=lambda: ["customer"])
    display_name: Optional[str] = None
    preferred_language: str = "en"
    onboarding_status: str = "completed"
    shg_id: Optional[UUID] = None
    artisan_id: Optional[UUID] = None
    buyer_id: Optional[UUID] = None
    profile_details: Dict[str, Any] = Field(default_factory=dict)


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    preferred_language: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    craft_specialties: Optional[List[str]] = None
    shipping_address: Optional[Dict[str, Any]] = None


# -----------------------------------------------------------------------------
# Signup Requests (Role determined server-side)
# -----------------------------------------------------------------------------

class CustomerSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    full_name: str = Field(..., min_length=2)
    preferred_language: str = Field(default="en")


class BuyerSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    company_name: str = Field(..., min_length=2)
    gstin: str = Field(..., description="15-character GSTIN")
    contact_phone: str = Field(..., min_length=10)
    preferred_language: str = Field(default="en")

    @field_validator("gstin")
    @classmethod
    def check_gstin(cls, v: str) -> str:
        return validate_gstin_format(v)


class ArtisanSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=10)
    craft: str = Field(..., min_length=2, description="Craft technique (e.g. Aari Embroidery, Warli)")
    shg_id: Optional[UUID] = Field(default=None, description="SHG cluster to join")
    preferred_language: str = Field(default="hi")


class ShgSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, description="Coordinator full name")
    group_name: str = Field(..., min_length=2, description="SHG collective name")
    state: str = Field(..., min_length=2)
    district: str = Field(..., min_length=2)
    block: Optional[str] = None
    srlm_id: Optional[str] = None
    contact_phone: str = Field(..., min_length=10)
    preferred_language: str = Field(default="en")


class UnifiedSignupRequest(BaseModel):
    role: Literal["customer", "buyer", "artisan", "coordinator"]
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    preferred_language: str = Field(default="en")

    # B2B fields
    company_name: Optional[str] = None
    gstin: Optional[str] = None

    # Artisan / SHG fields
    phone: Optional[str] = None
    craft: Optional[str] = None
    shg_id: Optional[UUID] = None

    # SHG fields
    group_name: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    block: Optional[str] = None
    srlm_id: Optional[str] = None
    contact_phone: Optional[str] = None

    @field_validator("gstin")
    @classmethod
    def check_gstin_optional(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return validate_gstin_format(v)
        return v


class SignupResponse(BaseModel):
    user_id: UUID
    email: str
    role: str
    onboarding_status: str
    message: str
    access_token: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8)


class ResendVerificationRequest(BaseModel):
    email: EmailStr
