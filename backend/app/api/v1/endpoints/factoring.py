from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, status
from app.api.deps import get_current_user, require_roles
from app.schemas.auth import CurrentUser
from app.schemas.factoring import (
    POFactoringCreate,
    POFactoringResponse,
    POFactoringTransitionRequest,
)
from app.services.factoring import POFactoringService, po_factoring_service

router = APIRouter(prefix="/factoring", tags=["PO Micro-Factoring & Working Capital Escrow"])


@router.get("/po", response_model=List[POFactoringResponse])
async def list_po_factoring(
    current_user: CurrentUser = Depends(require_roles(["coordinator", "buyer"])),
    service: POFactoringService = Depends(lambda: po_factoring_service),
):
    """
    List all PO micro-factoring requests with simulated escrow ledger history.
    """
    return service.list_factoring()


@router.get("/po/{factoring_id}", response_model=POFactoringResponse)
async def get_po_factoring_detail(
    factoring_id: UUID,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "buyer"])),
    service: POFactoringService = Depends(lambda: po_factoring_service),
):
    """
    Retrieve single PO factoring record with full simulated ledger trail.
    """
    return service.get_factoring(factoring_id)


@router.post("/po", response_model=POFactoringResponse, status_code=status.HTTP_201_CREATED)
async def create_po_factoring(
    payload: POFactoringCreate,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "buyer"])),
    service: POFactoringService = Depends(lambda: po_factoring_service),
):
    """
    Register a corporate Purchase Order for micro-factoring (status='po_created').
    """
    return await service.create_po_factoring(payload, actor_id=current_user.id)


@router.post("/po/{factoring_id}/tokenize", response_model=POFactoringResponse)
async def tokenize_purchase_order(
    factoring_id: UUID,
    payload: Optional[POFactoringTransitionRequest] = None,
    current_user: CurrentUser = Depends(require_roles(["coordinator"])),
    service: POFactoringService = Depends(lambda: po_factoring_service),
):
    """
    Step 2: Transition po_created -> tokenized.
    Mints a simulated Layer-2 factoring voucher locking the PO in escrow.
    """
    return await service.tokenize_po(factoring_id, actor_id=current_user.id, payload=payload)


@router.post("/po/{factoring_id}/disburse-advance", response_model=POFactoringResponse)
async def disburse_factoring_advance(
    factoring_id: UUID,
    payload: Optional[POFactoringTransitionRequest] = None,
    current_user: CurrentUser = Depends(require_roles(["coordinator"])),
    service: POFactoringService = Depends(lambda: po_factoring_service),
):
    """
    Step 3: Transition tokenized -> advance_disbursed (70%).
    Disburses 70% upfront working capital to the SHG collective via simulated DBT.
    """
    return await service.disburse_advance(factoring_id, actor_id=current_user.id, payload=payload)


@router.post("/po/{factoring_id}/deliver", response_model=POFactoringResponse)
async def mark_po_delivered(
    factoring_id: UUID,
    payload: Optional[POFactoringTransitionRequest] = None,
    current_user: CurrentUser = Depends(require_roles(["buyer", "coordinator"])),
    service: POFactoringService = Depends(lambda: po_factoring_service),
):
    """
    Step 4: Transition advance_disbursed -> delivered.
    Buyer confirms goods delivery and releases escrow lock condition.
    """
    return await service.mark_delivered(factoring_id, actor_id=current_user.id, payload=payload)


@router.post("/po/{factoring_id}/release-escrow", response_model=POFactoringResponse)
async def release_factoring_escrow(
    factoring_id: UUID,
    payload: Optional[POFactoringTransitionRequest] = None,
    current_user: CurrentUser = Depends(require_roles(["coordinator"])),
    service: POFactoringService = Depends(lambda: po_factoring_service),
):
    """
    Step 5: Transition delivered -> escrow_released (30%).
    Releases the remaining 30% balance to the SHG collective, fully closing the PO.
    """
    return await service.release_escrow(factoring_id, actor_id=current_user.id, payload=payload)
