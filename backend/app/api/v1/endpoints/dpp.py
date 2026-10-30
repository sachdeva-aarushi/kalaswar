from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import get_optional_current_user, require_roles
from app.schemas.auth import CurrentUser
from app.schemas.dpp import (
    BatchCommitResponse,
    DPPBatchRequest,
    DPPPassportResponse,
    PassportIssueRequest,
    PassportVerificationResponse,
    PublicPassportDetailResponse,
)
from app.services.merkle import MerkleService, merkle_service

router = APIRouter(tags=["Digital Product Passports (DPP) & Layer-2 Provenance"])


def _to_passport_response(p: dict) -> DPPPassportResponse:
    return DPPPassportResponse(
        id=UUID(str(p["id"])),
        token=p["token"],
        product_id=UUID(str(p["product_id"])),
        product_title=p["product_title"],
        craft_category=p["craft_category"],
        maker_display_name=p["maker_display_name"],
        cluster_name=p["cluster_name"],
        gps_region=p["gps_region"],
        wage_split_pct=float(p["wage_split_pct"]),
        leaf_hash=p["leaf_hash"],
        merkle_root=p["merkle_root"],
        polygon_tx_hash=p.get("polygon_tx_hash"),
        chain=p.get("chain", "polygon_amoy"),
        committed_at=p.get("committed_at"),
        qr_code_url=f"/public/passports/{p['token']}",
        is_committed=bool(p.get("is_committed", False)),
        is_verified_on_chain=bool(p.get("polygon_tx_hash") is not None),
    )


def _to_public_response(p: dict) -> PublicPassportDetailResponse:
    tx_hash = p.get("polygon_tx_hash")
    explorer = f"https://amoy.polygonscan.com/tx/{tx_hash}" if tx_hash else None
    return PublicPassportDetailResponse(
        token=p["token"],
        product_id=UUID(str(p["product_id"])),
        product_title=p["product_title"],
        craft_category=p["craft_category"],
        maker_display_name=p["maker_display_name"],
        cluster_name=p["cluster_name"],
        gps_region=p["gps_region"],
        wage_split_pct=float(p["wage_split_pct"]),
        merkle_root=p["merkle_root"],
        polygon_tx_hash=tx_hash,
        chain=p.get("chain", "polygon_amoy"),
        committed_at=p.get("committed_at"),
        is_verified_on_chain=bool(tx_hash is not None),
        explorer_url=explorer,
    )


# ---------------------------------------------------------------------------
# 1. Issue Passport on Publish
# ---------------------------------------------------------------------------
@router.post("/dpp/issue", response_model=DPPPassportResponse, status_code=status.HTTP_201_CREATED)
async def issue_product_passport(
    payload: PassportIssueRequest,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "artisan"])),
    service: MerkleService = Depends(lambda: merkle_service),
):
    """
    Issue a Digital Product Passport upon product verification / publication.
    Computes canonical leaf hash from product ID, maker ID, regional GPS, and fair wage split.
    """
    passport = service.issue_passport(
        product_id=payload.product_id,
        maker_id=payload.maker_id,
        product_title=payload.product_title,
        craft_category=payload.craft_category,
        maker_display_name=payload.maker_display_name,
        cluster_name=payload.cluster_name,
        gps_region=payload.gps_region,
        wage_split_pct=payload.wage_split_pct,
        creator_user_id=current_user.id,
    )
    return _to_passport_response(passport)


# ---------------------------------------------------------------------------
# 2. Batch Anchoring (CLI + Endpoint)
# ---------------------------------------------------------------------------
@router.post("/dpp/batch-commit", response_model=BatchCommitResponse)
async def batch_commit_merkle_roots(
    batch: DPPBatchRequest = DPPBatchRequest(),
    current_user: Optional[CurrentUser] = Depends(get_optional_current_user),
    service: MerkleService = Depends(lambda: merkle_service),
):
    """
    Batch job endpoint: builds Merkle tree from pending passport leaf hashes
    and anchors the root to Polygon Layer-2 using the active ChainAdapter.
    """
    res = await service.commit_batch(batch_size=batch.batch_size)
    return BatchCommitResponse(
        status=res.get("status", "success"),
        message=res.get("message", "Batch commit processed."),
        total_passports=res.get("total_passports", 0),
        merkle_root=res.get("merkle_root"),
        polygon_tx_hash=res.get("polygon_tx_hash"),
        chain=res.get("chain", "polygon_amoy"),
        committed_at=res.get("committed_at"),
        is_simulated=True,
    )


# ---------------------------------------------------------------------------
# 3. Public Passport Detail (Privacy-Safe)
# ---------------------------------------------------------------------------
@router.get("/dpp/public/passports/{token}", response_model=PublicPassportDetailResponse)
@router.get("/public/passports/{token}", response_model=PublicPassportDetailResponse)
async def get_public_passport(
    token: str,
    service: MerkleService = Depends(lambda: merkle_service),
):
    """
    Public QR token resolution endpoint:
    Returns immutable craft provenance, maker identity (privacy-safe: first name + initial only),
    regional GPS coordinates, and guaranteed fair wage breakdown.
    """
    passport = service.get_passport(token)
    if not passport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Digital Product Passport '{token}' not found.",
        )
    return _to_public_response(passport)


# ---------------------------------------------------------------------------
# 4. Proof Verification Endpoint
# ---------------------------------------------------------------------------
@router.get("/dpp/public/passports/{token}/verify", response_model=PassportVerificationResponse)
@router.get("/public/passports/{token}/verify", response_model=PassportVerificationResponse)
@router.get("/dpp/verify/{token}", response_model=PassportVerificationResponse)
async def verify_passport_proof(
    token: str,
    service: MerkleService = Depends(lambda: merkle_service),
):
    """
    Cryptographic verification endpoint:
    Verifies that the passport leaf hash resolves to the Merkle root via sibling proof hashes,
    and checks on-chain transaction receipt.
    """
    verification = await service.verify_passport(token)
    if not verification.get("token"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Passport '{token}' not found.",
        )

    return PassportVerificationResponse(
        verified=verification["verified"],
        leaf_verified=verification["leaf_verified"],
        on_chain_verified=verification["on_chain_verified"],
        token=verification["token"],
        product_id=UUID(str(verification["product_id"])),
        leaf_hash=verification["leaf_hash"],
        merkle_root=verification["merkle_root"],
        polygon_tx_hash=verification.get("polygon_tx_hash"),
        chain=verification.get("chain", "polygon_amoy"),
        committed_at=verification.get("committed_at"),
        proof_elements_count=verification.get("proof_elements_count", 0),
        message=verification["message"],
    )
