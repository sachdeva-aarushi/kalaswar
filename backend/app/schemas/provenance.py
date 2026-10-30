"""
Pydantic schemas for the product provenance, blockchain batch,
and QR tag features (migration 0018).

Privacy note: coarse_location must be district-level only (no exact GPS).
actor_display_name must be privacy-safe (e.g. "Radha D.", not full name + phone).
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ─── Enums ────────────────────────────────────────────────────────────────────


class ProvenanceStage(str, Enum):
    PRODUCTION_STARTED = "PRODUCTION_STARTED"
    INSPECTED_AND_PACKAGED = "INSPECTED_AND_PACKAGED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED_AND_VERIFIED = "DELIVERED_AND_VERIFIED"


class BatchLifecycleStatus(str, Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    CONFIRMED = "CONFIRMED"
    FAILED = "FAILED"


class QrTagStatus(str, Enum):
    ACTIVE = "ACTIVE"
    REVOKED = "REVOKED"
    REPLACED = "REPLACED"


class ActorRole(str, Enum):
    ARTISAN = "artisan"
    COORDINATOR = "coordinator"
    LOGISTICS = "logistics"
    BUYER = "buyer"
    ADMIN = "admin"


# ─── Provenance Stage Events ─────────────────────────────────────────────────


class ProvenanceStageCreate(BaseModel):
    """Request body to record a provenance stage event.

    The backend is responsible for:
    - Computing ``canonical_hash`` (never accepted from the client).
    - Setting ``recorded_by`` from the authenticated JWT.
    - Server-side ``occurred_at`` if omitted.
    """

    product_id: UUID
    order_id: Optional[UUID] = None
    stage: ProvenanceStage
    actor_role: ActorRole
    actor_display_name: str = Field(
        ...,
        min_length=1,
        max_length=120,
        description="Privacy-safe display name (e.g. 'Radha D.'). No PII.",
    )
    coarse_location: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="District / state only (e.g. 'Bolpur, Birbhum, West Bengal'). No GPS.",
    )
    idempotency_key: Optional[str] = Field(
        default=None,
        max_length=128,
        description="Client-generated key to safely retry failed requests.",
    )
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ProvenanceStageResponse(BaseModel):
    """Full row returned after recording a provenance event."""

    id: UUID
    product_id: UUID
    order_id: Optional[UUID] = None
    stage: ProvenanceStage
    stage_sequence: int
    actor_role: ActorRole
    actor_display_name: str
    recorded_by: Optional[UUID] = None
    coarse_location: str
    canonical_hash: str
    batch_id: Optional[UUID] = None
    merkle_index: Optional[int] = None
    merkle_proof: Optional[List[Dict[str, Any]]] = None
    idempotency_key: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProvenanceTimelineResponse(BaseModel):
    """Complete timeline of all stages recorded for a single product."""

    product_id: UUID
    stages: List[ProvenanceStageResponse]
    current_stage: Optional[ProvenanceStage] = None
    is_complete: bool = False


# ─── Blockchain Batches ──────────────────────────────────────────────────────


class BlockchainBatchCreate(BaseModel):
    """Internal request to create a new Merkle batch commit."""

    merkle_root: str = Field(
        ...,
        pattern=r"^0x[0-9a-fA-F]{64}$",
        description="32-byte Merkle root as hex string.",
    )
    leaf_count: int = Field(..., gt=0)
    chain_id: int = Field(default=137, description="Polygon chain ID (137=Mainnet, 80002=Amoy).")
    contract_address: Optional[str] = None


class BlockchainBatchResponse(BaseModel):
    """Full blockchain batch row."""

    id: UUID
    batch_reference: str
    merkle_root: str
    leaf_count: int
    status: BatchLifecycleStatus
    chain_id: int
    contract_address: Optional[str] = None
    tx_hash: Optional[str] = None
    block_number: Optional[int] = None
    submitted_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BlockchainBatchConfirm(BaseModel):
    """Confirmation payload from the blockchain worker after tx is mined."""

    tx_hash: str = Field(..., description="Polygon transaction hash.")
    block_number: int = Field(..., gt=0)
    contract_address: Optional[str] = None


class BlockchainBatchFail(BaseModel):
    """Failure payload when a batch submission fails."""

    error_message: str


# ─── QR Tags ─────────────────────────────────────────────────────────────────


class QrTagCreate(BaseModel):
    """Request to issue a new QR tag for a product.

    The backend generates the secret bearer token and computes ``token_hash``.
    The caller does NOT provide the token — it is returned exactly once in
    ``QrTagCreateResponse``.
    """

    product_id: UUID


class QrTagCreateResponse(BaseModel):
    """Response after issuing a QR tag.

    ``bearer_token`` is the raw secret and is returned exactly once.
    The client must display it as a QR code immediately; it is NEVER stored
    in the database.
    """

    id: UUID
    product_id: UUID
    public_code: str
    bearer_token: str = Field(
        ...,
        description="Raw secret bearer token – shown once, never stored in DB.",
    )
    version: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QrTagResponse(BaseModel):
    """QR tag row (admin / coordinator view). Excludes bearer_token."""

    id: UUID
    product_id: UUID
    public_code: str
    status: QrTagStatus
    is_active: bool
    version: int
    revoked_at: Optional[datetime] = None
    revoked_reason: Optional[str] = None
    replaced_by_tag_id: Optional[UUID] = None
    issued_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QrTagReplaceRequest(BaseModel):
    """Request to revoke and replace an existing QR tag."""

    product_id: UUID
    reason: str = Field(
        default="Tag replaced",
        max_length=200,
        description="Reason for replacement (e.g. 'Damaged tag', 'Security rotation').",
    )


class QrTagVerifyRequest(BaseModel):
    """Public verification request from a customer scanning a QR code."""

    bearer_token: str = Field(
        ...,
        min_length=32,
        description="Raw bearer token embedded in the QR code.",
    )


class QrTagVerifyResponse(BaseModel):
    """Public verification result — no internal data exposed."""

    is_valid: bool
    tag_status: str
    product_id: Optional[UUID] = None
    public_code: Optional[str] = None
    version: Optional[int] = None
    message: str = Field(
        default="",
        description="Human-readable verification outcome.",
    )

