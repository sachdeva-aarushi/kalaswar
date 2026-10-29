from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class FactoringLedgerItem(BaseModel):
    step: str
    action: str
    amount_inr: float
    direction: str
    tx_reference: str
    note: str
    timestamp: str
    is_simulated: bool = True

    model_config = ConfigDict(from_attributes=True)


class POFactoringCreate(BaseModel):
    po_reference: str = Field(..., description="Purchase Order number (e.g. 'PO-FABINDIA-2026-881')")
    po_amount_inr: float = Field(..., gt=0, description="Total Purchase Order value in INR")
    buyer_id: Optional[UUID] = None
    buyer_name: str = Field(default="Corporate Buyer", description="Buyer / Retailer organisation name")
    shg_id: Optional[UUID] = None
    shg_name: str = Field(default="Santiniketan Mahila Hastakala Samiti", description="Fulfilling SHG collective name")
    order_id: Optional[UUID] = None
    advance_percent: float = Field(default=70.0, ge=10.0, le=90.0, description="Advance percentage (standard 70%)")
    notes: Optional[str] = None


class POFactoringTransitionRequest(BaseModel):
    notes: Optional[str] = None
    tx_reference: Optional[str] = None


class POFactoringResponse(BaseModel):
    id: UUID
    po_reference: str
    buyer_id: Optional[UUID] = None
    buyer_name: str
    shg_id: Optional[UUID] = None
    shg_name: str
    order_id: Optional[UUID] = None
    po_amount_inr: float
    advance_percent: float
    advance_amount_inr: float
    escrow_amount_inr: float
    status: str = Field(..., description="po_created, tokenized, advance_disbursed, delivered, escrow_released")
    is_simulated: bool = True
    simulation_notice: str = "DEMO SIMULATED PO FACTORING: Tokenization, escrow locking, and disbursements are simulated."
    ledger: List[FactoringLedgerItem] = Field(default_factory=list)
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)
