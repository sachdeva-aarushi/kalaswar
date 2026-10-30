from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.schemas.auth import CurrentUser
from app.schemas.proposals import (
    ProposalApproveRequest,
    ProposalCreateRequest,
    ProposalResponse,
    ProposalReviseRequest,
    SampleRequestCreate,
    SampleResponse,
    SampleStatusUpdateRequest,
)
from app.services.proposals import proposal_service

router = APIRouter(prefix="/proposals", tags=["Proposal & Quote Versioning State Machine"])


@router.get(
    "",
    response_model=List[ProposalResponse],
    summary="List proposals, optionally filtered by request_id",
)
async def list_proposals_endpoint(
    request_id: Optional[UUID] = None,
    current_user: Optional[CurrentUser] = Depends(get_current_user),
):
    """
    List all proposals in the workroom, optionally filtered by custom request ID.
    """
    return await proposal_service.list_proposals(request_id=request_id)



@router.post(
    "",
    response_model=ProposalResponse,
    summary="Create a new draft proposal (Version 1)",
)
async def create_new_proposal(
    payload: ProposalCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Creates an initial draft proposal (version 1) with specifications, pricing build-up, and delivery terms.
    Initial status: 'draft'.
    """
    return await proposal_service.create_proposal(payload, actor_user_id=current_user.id)


@router.get(
    "/{proposal_id}",
    response_model=ProposalResponse,
    summary="Retrieve proposal detail with full version history and sample requests",
)
async def get_proposal_detail(proposal_id: UUID):
    """
    Retrieves proposal specification, current version status, approval records,
    and complete version history.
    """
    return await proposal_service.get_proposal(proposal_id)


@router.post(
    "/{proposal_id}/submit",
    response_model=ProposalResponse,
    summary="Submit proposal (locks version against silent modification)",
)
async def submit_proposal_endpoint(
    proposal_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Submits proposal for counter-party review.
    Current version transitions to 'submitted' and becomes immutable.
    """
    approver = current_user.user_metadata.get("full_name") or current_user.email or "Coordinator"
    return await proposal_service.submit_proposal(proposal_id, submitted_by=approver, actor_user_id=current_user.id)


@router.post(
    "/{proposal_id}/revise",
    response_model=ProposalResponse,
    summary="Material change: creates a brand new version (increments version, previous superseded)",
)
async def revise_proposal_endpoint(
    proposal_id: UUID,
    payload: ProposalReviseRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Material Change Rule:
    Any change to items, quantities, pricing, or timelines creates a brand new version.
    Previous version is marked superseded and preserved immutably for audit.
    Any prior approvals on the old version do NOT carry over.
    """
    return await proposal_service.revise_proposal(proposal_id, payload, actor_user_id=current_user.id)


@router.post(
    "/{proposal_id}/approve",
    response_model=ProposalResponse,
    summary="Two-sided approval state machine (Both parties must approve the EXACT SAME version)",
)
async def approve_proposal_version_endpoint(
    proposal_id: UUID,
    payload: ProposalApproveRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Two-Sided Approval State Machine:
    - Approver must specify the exact version number being approved.
    - Transition Guard: Approving a superseded/outdated version is rejected with 409 Conflict.
    - When BOTH the Coordinator and Buyer approve the EXACT SAME version:
      Status automatically transitions to 'confirmed' and a confirmed order is issued.
    """
    return await proposal_service.approve_proposal_version(proposal_id, payload, actor_user_id=current_user.id)


@router.post(
    "/{proposal_id}/samples",
    response_model=SampleResponse,
    summary="Sample request flow: request physical pre-production sample",
)
async def create_sample_request_endpoint(
    proposal_id: UUID,
    payload: SampleRequestCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Buyer requests a pre-production sample tied to a specific proposal specification version.
    """
    return await proposal_service.create_sample_request(proposal_id, payload, actor_user_id=current_user.id)


@router.patch(
    "/{proposal_id}/samples/{sample_id}",
    response_model=SampleResponse,
    summary="Sample request flow: advance sample production and review status",
)
async def update_sample_status_endpoint(
    proposal_id: UUID,
    sample_id: UUID,
    payload: SampleStatusUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Advances sample lifecycle:
    'approved_for_production' -> 'in_production' -> 'dispatched' -> 'delivered' -> 'approved'.
    """
    return await proposal_service.update_sample_status(proposal_id, sample_id, payload, actor_user_id=current_user.id)
