from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field

class DPPBatchRequest(BaseModel):
    product_ids: List[UUID] = Field(..., max_length=500, description="Batch of up to 500 product IDs to aggregate into Merkle tree")

class MerkleProof(BaseModel):
    leaf: str
    root: str
    proof: List[str]
    index: int

class DPPPassportResponse(BaseModel):
    passport_id: UUID
    product_id: UUID
    artisan_name: str
    shg_cluster_name: str
    craft_origin: str
    gps_coordinates: Optional[str] = None
    wage_distribution_pct: float = Field(68.0, description="Percentage of retail price paid to artisan")
    merkle_root: str
    polygon_tx_hash: Optional[str] = None
    qr_code_url: str
    is_verified_on_chain: bool = False
