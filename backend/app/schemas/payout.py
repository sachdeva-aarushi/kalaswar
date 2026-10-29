from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class PayoutCreate(BaseModel):
    artisan_id: UUID
    amount_inr: float = Field(..., gt=0, description="Payout amount in INR")
    payout_type: str = Field(default="wage", description="wage, advance, tip, refund, adjustment, demo")
    channel: str = Field(default="dbt", description="upi, bank_transfer, dbt, cash, demo")
    order_id: Optional[UUID] = None
    note: Optional[str] = "Simulated DBT wage payout"
    is_demo: bool = True


class PayoutResponse(BaseModel):
    id: UUID
    artisan_id: Optional[UUID] = None
    artisan_name: Optional[str] = None
    shg_id: Optional[UUID] = None
    order_id: Optional[UUID] = None
    payout_type: str
    amount_inr: float
    reference: Optional[str] = None
    channel: str
    status: str
    initiated_at: str
    completed_at: Optional[str] = None
    note: Optional[str] = None
    is_demo: bool = True

    model_config = ConfigDict(from_attributes=True)


class SimulateDbtRequest(BaseModel):
    artisan_id: UUID
    amount_inr: float = Field(..., gt=0)
    order_id: Optional[UUID] = None
    bank_account_last4: Optional[str] = "4092"
    ifsc_code: Optional[str] = "SBIN0001234"
    aadhaar_last4: Optional[str] = "8821"
    note: Optional[str] = "Direct Benefit Transfer (DBT) wage disbursement"


class SimulateDbtResponse(BaseModel):
    payout_id: UUID
    reference: str
    artisan_id: UUID
    artisan_name: Optional[str] = None
    amount_inr: float
    channel: str = "dbt"
    status: str = "completed"
    pfms_txn_id: str
    initiated_at: str
    completed_at: str
    is_demo: bool = True
    message: str = "Direct Benefit Transfer simulated successfully in DEMO mode"
