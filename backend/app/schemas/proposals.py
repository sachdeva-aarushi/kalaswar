from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ApprovalRecord(BaseModel):
    approver_role: str = Field(..., description="'coordinator' | 'buyer'")
    approver_name: str
    approver_user_id: Optional[UUID] = None
    approved_at: str
    notes: Optional[str] = None


class ProposalSpec(BaseModel):
    title: str = Field(..., examples=["Custom Handloom Silk Scarves for Annual Gala"])
    craft: str = Field("Handloom Silk", examples=["Handloom Silk"])
    quantity: int = Field(..., gt=0, examples=[100])
    unit_price_inr: float = Field(..., gt=0, examples=[1450.0])
    total_price_inr: float = Field(..., gt=0, examples=[145000.0])
    timeline_days: int = Field(..., gt=0, examples=[30])
    materials_summary: str = Field(..., examples=["Pure Mulberry Silk with Zari border"])
    delivery_terms: str = Field("Doorstep delivery via insured postal parcel", examples=["Doorstep delivery"])
    cancellation_terms: str = Field("Full refund prior to loom warping; 50% thereafter", examples=["Cancellation terms"])
    customisation_details: Optional[str] = None
    costing_breakdown: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="ignore")


class ProposalVersionDetail(BaseModel):
    version: int
    spec: ProposalSpec
    status: str = Field(..., description="'draft' | 'submitted' | 'revised' | 'superseded' | 'confirmed'")
    created_by: str
    created_at: str
    coordinator_approval: Optional[ApprovalRecord] = None
    buyer_approval: Optional[ApprovalRecord] = None
    is_immutable: bool = False


class ProposalCreateRequest(BaseModel):
    title: str
    spec: ProposalSpec
    buyer_id: Optional[UUID] = None
    shg_id: Optional[UUID] = None
    request_id: Optional[UUID] = None
    created_by: str = "Coordinator"


class ProposalReviseRequest(BaseModel):
    reason_for_revision: str = Field(..., examples=["Adjusted quantity from 100 to 120 and updated silk unit rate"])
    new_spec: ProposalSpec
    revised_by: str = "Coordinator"


class ProposalDeclineRequest(BaseModel):
    version: int = Field(..., description="Exact proposal version number being declined")
    reason: str = Field(..., description="Mandatory decline or rejection reason")
    declined_by: Optional[str] = "Coordinator"


class ProposalApproveRequest(BaseModel):
    version: int = Field(..., description="Exact proposal version number being approved")
    approver_role: str = Field(..., description="'coordinator' or 'buyer'")
    approver_name: str
    notes: Optional[str] = None


class SampleRequestCreate(BaseModel):
    spec_version: int = Field(..., description="Proposal version this sample verifies")
    fee_inr: float = Field(..., ge=0, examples=[1200.0])
    notes: Optional[str] = Field("Pre-production physical sample review", examples=["Pre-production sample"])


class SampleStatusUpdateRequest(BaseModel):
    new_status: str = Field(
        ...,
        description="'approved_for_production' | 'in_production' | 'dispatched' | 'delivered' | 'approved' | 'revision_requested' | 'cancelled'"
    )
    tracking_number: Optional[str] = None
    feedback: Optional[str] = None


class SampleResponse(BaseModel):
    id: UUID
    proposal_id: UUID
    spec_version: int
    fee_inr: float
    status: str
    tracking_number: Optional[str] = None
    feedback: Optional[str] = None
    created_at: str
    updated_at: str


class ProposalResponse(BaseModel):
    id: UUID
    title: str
    current_version: int
    status: str
    current_spec: ProposalSpec
    versions: List[ProposalVersionDetail]
    both_parties_approved: bool
    confirmed_order_id: Optional[UUID] = None
    samples: List[SampleResponse] = Field(default_factory=list)
    created_at: str
    updated_at: str
