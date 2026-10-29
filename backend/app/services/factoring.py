from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import UUID, uuid4
from fastapi import HTTPException, status
from app.adapters.supabase import SupabaseAdapter, supabase_adapter
from app.core.logging import logger
from app.schemas.factoring import (
    FactoringLedgerItem,
    POFactoringCreate,
    POFactoringResponse,
    POFactoringTransitionRequest,
)
from app.services.audit import AuditService, audit_service


class POFactoringService:
    """
    PO Micro-Factoring State Machine:
    po_created -> tokenized -> advance_disbursed(70%) -> delivered -> escrow_released(30%)

    Enforces strict sequential transition guards and maintains an append-only simulated ledger
    with explicit 'is_simulated=True' flags.
    """

    ALLOWED_TRANSITIONS = {
        "po_created": "tokenized",
        "tokenized": "advance_disbursed",
        "advance_disbursed": "delivered",
        "delivered": "escrow_released",
    }

    def __init__(
        self,
        db: Optional[SupabaseAdapter] = None,
        audit: Optional[AuditService] = None,
    ):
        self.db = db or supabase_adapter
        self.audit = audit or audit_service
        self._pos: Dict[str, dict] = {}

        self._seed_demo_factoring()

    def _seed_demo_factoring(self):
        demo_id = "eeee1111-0001-0000-0000-000000000001"
        now_iso = "2026-10-27T10:00:00Z"
        po_amount = 250000.0  # ₹2,50,000 corporate PO
        advance_pct = 70.0
        advance_inr = round(po_amount * advance_pct / 100, 2)
        escrow_inr = round(po_amount - advance_inr, 2)

        self._pos[demo_id] = {
            "id": UUID(demo_id),
            "po_reference": "PO-FABINDIA-2026-881",
            "buyer_id": UUID("dddd1111-0001-0000-0000-000000000001"),
            "buyer_name": "FabIndia Sourcing Team",
            "shg_id": UUID("bbbbbbbb-0001-0000-0000-000000000001"),
            "shg_name": "Santiniketan Mahila Hastakala Samiti",
            "order_id": UUID("22222222-0003-0000-0000-000000000003"),
            "po_amount_inr": po_amount,
            "advance_percent": advance_pct,
            "advance_amount_inr": advance_inr,
            "escrow_amount_inr": escrow_inr,
            "status": "advance_disbursed",
            "is_simulated": True,
            "simulation_notice": "DEMO SIMULATED PO FACTORING: All tokenization, escrow locks, and disbursements are simulated.",
            "ledger": [
                FactoringLedgerItem(
                    step="po_created",
                    action="Purchase Order Logged",
                    amount_inr=po_amount,
                    direction="inward_po",
                    tx_reference="PO-FABINDIA-2026-881",
                    note="Verified corporate PO registered for festive silk collection",
                    timestamp="2026-10-27T10:00:00Z",
                    is_simulated=True,
                ),
                FactoringLedgerItem(
                    step="tokenized",
                    action="PO Tokenized on Layer-2",
                    amount_inr=po_amount,
                    direction="mint_escrow_token",
                    tx_reference="0x7f1a8c9b2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a",
                    note="ERC-1155 factoring voucher minted: 70% advance, 30% delivery escrow",
                    timestamp="2026-10-27T10:15:00Z",
                    is_simulated=True,
                ),
                FactoringLedgerItem(
                    step="advance_disbursed",
                    action="70% Working Capital Disbursed",
                    amount_inr=advance_inr,
                    direction="disbursement_to_shg",
                    tx_reference="DBT-SIM-ADV-992810",
                    note=f"₹{advance_inr:,.2f} disbursed to SHG bank account for raw materials and artisan wages",
                    timestamp="2026-10-27T11:00:00Z",
                    is_simulated=True,
                ),
            ],
            "created_at": now_iso,
            "updated_at": "2026-10-27T11:00:00Z",
        }

    def _to_response(self, record: dict) -> POFactoringResponse:
        return POFactoringResponse(
            id=record["id"],
            po_reference=record["po_reference"],
            buyer_id=record.get("buyer_id"),
            buyer_name=record.get("buyer_name", "Corporate Buyer"),
            shg_id=record.get("shg_id"),
            shg_name=record.get("shg_name", "SHG Collective"),
            order_id=record.get("order_id"),
            po_amount_inr=record["po_amount_inr"],
            advance_percent=record["advance_percent"],
            advance_amount_inr=record["advance_amount_inr"],
            escrow_amount_inr=record["escrow_amount_inr"],
            status=record["status"],
            is_simulated=True,
            simulation_notice=record.get(
                "simulation_notice",
                "DEMO SIMULATED PO FACTORING: All tokenization, escrow locks, and disbursements are simulated.",
            ),
            ledger=record.get("ledger", []),
            created_at=record["created_at"],
            updated_at=record["updated_at"],
        )

    async def create_po_factoring(self, payload: POFactoringCreate, actor_id: str) -> POFactoringResponse:
        """
        Step 1: Register Purchase Order for micro-factoring (status='po_created').
        """
        new_id = uuid4()
        now_iso = datetime.now(timezone.utc).isoformat()
        advance_pct = payload.advance_percent or 70.0
        advance_inr = round(payload.po_amount_inr * advance_pct / 100, 2)
        escrow_inr = round(payload.po_amount_inr - advance_inr, 2)

        init_ledger_item = FactoringLedgerItem(
            step="po_created",
            action="Purchase Order Created",
            amount_inr=payload.po_amount_inr,
            direction="inward_po",
            tx_reference=payload.po_reference,
            note=payload.notes or f"PO registered for ₹{payload.po_amount_inr:,.2f}",
            timestamp=now_iso,
            is_simulated=True,
        )

        record = {
            "id": new_id,
            "po_reference": payload.po_reference,
            "buyer_id": payload.buyer_id,
            "buyer_name": payload.buyer_name,
            "shg_id": payload.shg_id,
            "shg_name": payload.shg_name,
            "order_id": payload.order_id,
            "po_amount_inr": payload.po_amount_inr,
            "advance_percent": advance_pct,
            "advance_amount_inr": advance_inr,
            "escrow_amount_inr": escrow_inr,
            "status": "po_created",
            "is_simulated": True,
            "simulation_notice": "DEMO SIMULATED PO FACTORING: Tokenization, escrow locking, and disbursements are simulated.",
            "ledger": [init_ledger_item],
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        self._pos[str(new_id)] = record

        try:
            await self.db.insert_record("po_factoring", {
                "id": str(new_id),
                "po_reference": payload.po_reference,
                "po_amount_inr": payload.po_amount_inr,
                "advance_percent": advance_pct,
                "advance_disbursed": False,
                "status": "pending",
                "notes": payload.notes,
            })
        except Exception as e:
            logger.warning("DB po_factoring insert warning: %s", e)

        await self.audit.log_action(
            actor=actor_id,
            action="po_factoring_created",
            entity="po_factoring",
            entity_id=new_id,
            payload={"po_reference": payload.po_reference, "amount": payload.po_amount_inr},
        )

        return self._to_response(record)

    def list_factoring(self) -> List[POFactoringResponse]:
        return [self._to_response(r) for r in self._pos.values()]

    def get_factoring(self, factoring_id: UUID) -> POFactoringResponse:
        record = self._pos.get(str(factoring_id))
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"PO Factoring record '{factoring_id}' not found",
            )
        return self._to_response(record)

    async def tokenize_po(self, factoring_id: UUID, actor_id: str, payload: Optional[POFactoringTransitionRequest] = None) -> POFactoringResponse:
        """
        Step 2: po_created -> tokenized
        Locks PO against simulated smart contract and creates factoring voucher.
        """
        record = self._pos.get(str(factoring_id))
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"PO Factoring record '{factoring_id}' not found")

        current_status = record["status"]
        if current_status != "po_created":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Illegal transition: Cannot tokenize PO in '{current_status}' state (must be 'po_created').",
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        sim_tx_hash = payload.tx_reference if (payload and payload.tx_reference) else f"0x{uuid4().hex}{uuid4().hex}"[:66]

        record["status"] = "tokenized"
        record["updated_at"] = now_iso
        record["ledger"].append(
            FactoringLedgerItem(
                step="tokenized",
                action="PO Tokenized on Layer-2",
                amount_inr=record["po_amount_inr"],
                direction="mint_escrow_token",
                tx_reference=sim_tx_hash,
                note=payload.notes if (payload and payload.notes) else "PO locked in smart contract; 70% advance approved for disbursement",
                timestamp=now_iso,
                is_simulated=True,
            )
        )

        await self.audit.log_action(
            actor=actor_id,
            action="po_tokenized",
            entity="po_factoring",
            entity_id=factoring_id,
            payload={"tx_hash": sim_tx_hash},
        )

        return self._to_response(record)

    async def disburse_advance(self, factoring_id: UUID, actor_id: str, payload: Optional[POFactoringTransitionRequest] = None) -> POFactoringResponse:
        """
        Step 3: tokenized -> advance_disbursed (70%)
        Simulates upfront working capital disbursement to SHG cluster.
        """
        record = self._pos.get(str(factoring_id))
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"PO Factoring record '{factoring_id}' not found")

        current_status = record["status"]
        if current_status != "tokenized":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Illegal transition: Cannot disburse advance in '{current_status}' state (must be 'tokenized').",
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        advance_inr = record["advance_amount_inr"]
        dbt_ref = payload.tx_reference if (payload and payload.tx_reference) else f"DBT-SIM-ADV-{uuid4().hex[:8].upper()}"

        record["status"] = "advance_disbursed"
        record["updated_at"] = now_iso
        record["ledger"].append(
            FactoringLedgerItem(
                step="advance_disbursed",
                action="70% Advance Working Capital Disbursed",
                amount_inr=advance_inr,
                direction="disbursement_to_shg",
                tx_reference=dbt_ref,
                note=payload.notes if (payload and payload.notes) else f"₹{advance_inr:,.2f} transferred to SHG bank account via simulated DBT",
                timestamp=now_iso,
                is_simulated=True,
            )
        )

        await self.audit.log_action(
            actor=actor_id,
            action="po_advance_disbursed",
            entity="po_factoring",
            entity_id=factoring_id,
            payload={"advance_inr": advance_inr, "ref": dbt_ref},
        )

        return self._to_response(record)

    async def mark_delivered(self, factoring_id: UUID, actor_id: str, payload: Optional[POFactoringTransitionRequest] = None) -> POFactoringResponse:
        """
        Step 4: advance_disbursed -> delivered
        Acknowledges goods receipt and triggers escrow unlock readiness.
        """
        record = self._pos.get(str(factoring_id))
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"PO Factoring record '{factoring_id}' not found")

        current_status = record["status"]
        if current_status != "advance_disbursed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Illegal transition: Cannot mark delivered in '{current_status}' state (must be 'advance_disbursed').",
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        del_ref = payload.tx_reference if (payload and payload.tx_reference) else f"DELIVERY-ACK-{uuid4().hex[:8].upper()}"

        record["status"] = "delivered"
        record["updated_at"] = now_iso
        record["ledger"].append(
            FactoringLedgerItem(
                step="delivered",
                action="Buyer Delivery Receipt Confirmed",
                amount_inr=record["po_amount_inr"],
                direction="delivery_ack",
                tx_reference=del_ref,
                note=payload.notes if (payload and payload.notes) else "Quality and quantity confirmed by buyer; 30% escrow ready for release",
                timestamp=now_iso,
                is_simulated=True,
            )
        )

        await self.audit.log_action(
            actor=actor_id,
            action="po_delivered",
            entity="po_factoring",
            entity_id=factoring_id,
            payload={"delivery_ref": del_ref},
        )

        return self._to_response(record)

    async def release_escrow(self, factoring_id: UUID, actor_id: str, payload: Optional[POFactoringTransitionRequest] = None) -> POFactoringResponse:
        """
        Step 5: delivered -> escrow_released (30%)
        Releases the remaining 30% balance held in smart contract escrow to the SHG collective.
        """
        record = self._pos.get(str(factoring_id))
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"PO Factoring record '{factoring_id}' not found")

        current_status = record["status"]
        if current_status != "delivered":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Illegal transition: Cannot release escrow in '{current_status}' state (must be 'delivered').",
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        escrow_inr = record["escrow_amount_inr"]
        escrow_tx = payload.tx_reference if (payload and payload.tx_reference) else f"ESCROW-REL-{uuid4().hex[:8].upper()}"

        record["status"] = "escrow_released"
        record["updated_at"] = now_iso
        record["ledger"].append(
            FactoringLedgerItem(
                step="escrow_released",
                action="30% Escrow Released to Collective",
                amount_inr=escrow_inr,
                direction="escrow_release_to_shg",
                tx_reference=escrow_tx,
                note=payload.notes if (payload and payload.notes) else f"Final balance ₹{escrow_inr:,.2f} released from escrow; PO fully settled",
                timestamp=now_iso,
                is_simulated=True,
            )
        )

        await self.audit.log_action(
            actor=actor_id,
            action="po_escrow_released",
            entity="po_factoring",
            entity_id=factoring_id,
            payload={"escrow_amount_inr": escrow_inr, "tx": escrow_tx},
        )

        return self._to_response(record)


# Singleton
po_factoring_service = POFactoringService()
