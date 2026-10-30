from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from app.schemas.auth import validate_gstin_format


class ShgRegistrationRequest(BaseModel):
    group_name: str = Field(..., min_length=2, description="Collective name")
    state: str = Field(..., min_length=2)
    district: str = Field(..., min_length=2)
    block: Optional[str] = None
    srlm_id: Optional[str] = Field(default=None, description="Government SRLM registration ID")
    contact: str = Field(..., min_length=10, description="Coordinator phone number or email")


class ArtisanJoinRequest(BaseModel):
    shg_id: UUID = Field(..., description="Target SHG cluster to join")
    craft: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=10)
    bio: Optional[str] = None


class ArtisanApprovalRequest(BaseModel):
    approved: bool
    note: Optional[str] = None


class ArtisanInviteRequest(BaseModel):
    phone: str = Field(..., min_length=10)
    name: Optional[str] = None
    craft: Optional[str] = None


class CustomerAddressRequest(BaseModel):
    name: str = Field(..., min_length=2)
    street: str = Field(..., min_length=5)
    city: str = Field(..., min_length=2)
    state: str = Field(..., min_length=2)
    pincode: str = Field(..., min_length=6, max_length=6)
    phone: str = Field(..., min_length=10)


class BuyerOnboardingRequest(BaseModel):
    company_name: str = Field(..., min_length=2)
    gstin: str = Field(..., description="15-character GSTIN")
    contact_person: str = Field(..., min_length=2)
    contact_phone: str = Field(..., min_length=10)
    contact_email: Optional[str] = None

    @field_validator("gstin")
    @classmethod
    def check_gstin(cls, v: str) -> str:
        return validate_gstin_format(v)


class ShgClusterSummary(BaseModel):
    id: UUID
    name: str
    state: str
    district: str
    srlm_id: Optional[str] = None
    artisan_count: int = 0


class ArtisanRequestItem(BaseModel):
    id: UUID
    artisan_id: UUID
    name: str
    phone: Optional[str] = None
    craft: str
    status: str
    shg_id: UUID
    created_at: str

