from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class PassportIssueRequest(BaseModel):
    product_id: UUID
    maker_id: UUID
    product_title: str
    craft_category: str
    maker_display_name: str = Field(..., description="Privacy-safe artisan name (e.g. 'Radha D.')")
    cluster_name: str = Field(..., description="SHG cluster / collective name")
    gps_region: str = Field(..., description="Coarse regional location (e.g. 'Bolpur, Birbhum, West Bengal')")
    wage_split_pct: float = Field(default=68.0, ge=0, le=100, description="Percentage of retail price paid to artisan")


class MerkleProofItem(BaseModel):
    position: str = Field(..., description="'left' or 'right'")
    data: str = Field(..., description="32-byte hex node hash")


class DPPBatchRequest(BaseModel):
    batch_size: int = Field(default=500, ge=1, le=1000, description="Max passports to commit in this batch")


class DPPPassportResponse(BaseModel):
    id: UUID
    token: str
    product_id: UUID
    product_title: str
    craft_category: str
    maker_display_name: str
    cluster_name: str
    gps_region: str
    wage_split_pct: float
    leaf_hash: str
    merkle_root: str
    polygon_tx_hash: Optional[str] = None
    chain: str = "polygon_amoy"
    committed_at: Optional[str] = None
    qr_code_url: str
    is_committed: bool = False
    is_verified_on_chain: bool = False

    model_config = ConfigDict(from_attributes=True)


class PublicPassportDetailResponse(BaseModel):
    token: str
    product_id: UUID
    product_title: str
    craft_category: str
    maker_display_name: str = Field(..., description="Privacy-preserving maker name without Aadhaar or phone")
    cluster_name: str
    gps_region: str = Field(..., description="Regional coordinates / craft territory without exact residence")
    wage_split_pct: float = Field(..., description="Guaranteed artisan wage percentage breakdown")
    merkle_root: str
    polygon_tx_hash: Optional[str] = None
    chain: str = "polygon_amoy"
    committed_at: Optional[str] = None
    is_verified_on_chain: bool = False
    explorer_url: Optional[str] = None
    privacy_policy_notice: str = "PII protected: Maker identity anonymized to first name and collective cluster."

    model_config = ConfigDict(from_attributes=True)


class PassportVerificationResponse(BaseModel):
    verified: bool
    leaf_verified: bool
    on_chain_verified: bool
    token: str
    product_id: UUID
    leaf_hash: str
    merkle_root: str
    polygon_tx_hash: Optional[str] = None
    chain: str = "polygon_amoy"
    committed_at: Optional[str] = None
    proof_elements_count: int
    message: str

    model_config = ConfigDict(from_attributes=True)


class BatchCommitResponse(BaseModel):
    status: str
    message: str
    total_passports: int
    merkle_root: Optional[str] = None
    polygon_tx_hash: Optional[str] = None
    chain: str = "polygon_amoy"
    committed_at: Optional[str] = None
    is_simulated: bool = True
