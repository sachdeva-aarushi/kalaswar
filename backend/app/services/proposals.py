from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from app.adapters.supabase import SupabaseAdapter, supabase_adapter
from app.core.errors import ConflictError, NotFoundError
from app.core.logging import logger
from app.schemas.proposals import (
    ApprovalRecord,
    ProposalApproveRequest,
    ProposalCreateRequest,
    ProposalResponse,
    ProposalReviseRequest,
    ProposalSpec,
    ProposalVersionDetail,
    SampleRequestCreate,
    SampleResponse,
    SampleStatusUpdateRequest,
)
from app.services.audit import AuditService, audit_service

# In-memory storage backing deterministic tests and development
_IN_MEMORY_PROPOSALS: Dict[str, Dict[str, Any]] = {}
_IN_MEMORY_SAMPLES: Dict[str, List[Dict[str, Any]]] = {}


class ProposalService:
    def __init__(
        self,
        db: Optional[SupabaseAdapter] = None,
        audit: Optional[AuditService] = None,
    ):
        self.db = db or supabase_adapter
        self.audit = audit or audit_service

    def _to_response(self, p_data: Dict[str, Any]) -> ProposalResponse:
        current_ver_num = p_data["current_version"]
        versions_list = [
            ProposalVersionDetail(**v) for v in p_data["versions"]
        ]
        current_version_obj = next(
            (v for v in versions_list if v.version == current_ver_num),
            versions_list[-1],
        )
        samples_list = [
            SampleResponse(**s) for s in _IN_MEMORY_SAMPLES.get(str(p_data["id"]), [])
        ]
        
        both_approved = bool(
            current_version_obj.coordinator_approval is not None
            and current_version_obj.buyer_approval is not None
        )

        return ProposalResponse(
            id=UUID(str(p_data["id"])),
            title=p_data["title"],
            current_version=current_ver_num,
            status=p_data["status"],
            current_spec=current_version_obj.spec,
            versions=versions_list,
            both_parties_approved=both_approved,
            confirmed_order_id=UUID(str(p_data["confirmed_order_id"])) if p_data.get("confirmed_order_id") else None,
            samples=samples_list,
            created_at=p_data["created_at"],
            updated_at=p_data["updated_at"],
        )

    async def create_proposal(
        self,
        req: ProposalCreateRequest,
        actor_user_id: Optional[UUID] = None,
    ) -> ProposalResponse:
        """
        Creates a new draft proposal at version 1.
        Initial status: 'draft'.
        """
        now = datetime.now(timezone.utc).isoformat()
        proposal_id = str(uuid4())

        initial_version = {
            "version": 1,
            "spec": req.spec.model_dump(),
            "status": "draft",
            "created_by": req.created_by,
            "created_at": now,
            "coordinator_approval": None,
            "buyer_approval": None,
            "is_immutable": False,
        }

        record = {
            "id": proposal_id,
            "title": req.title,
            "current_version": 1,
            "status": "draft",
            "buyer_id": str(req.buyer_id) if req.buyer_id else None,
            "shg_id": str(req.shg_id) if req.shg_id else "bbbbbbbb-0001-0000-0000-000000000001",
            "request_id": str(req.request_id) if req.request_id else None,
            "confirmed_order_id": None,
            "versions": [initial_version],
            "created_at": now,
            "updated_at": now,
        }

        _IN_MEMORY_PROPOSALS[proposal_id] = record
        _IN_MEMORY_SAMPLES[proposal_id] = []

        await self.audit.log_action(
            actor=req.created_by,
            action="proposal_created",
            entity="proposals",
            entity_id=UUID(proposal_id),
            actor_user_id=actor_user_id,
            payload={"version": 1, "title": req.title, "quantity": req.spec.quantity},
        )

        return self._to_response(record)

    async def get_proposal(self, proposal_id: UUID) -> ProposalResponse:
        pid_str = str(proposal_id)
        if pid_str not in _IN_MEMORY_PROPOSALS:
            raise NotFoundError(f"Proposal with ID '{proposal_id}' was not found.")
        return self._to_response(_IN_MEMORY_PROPOSALS[pid_str])

    async def submit_proposal(
        self,
        proposal_id: UUID,
        submitted_by: str = "Coordinator",
        actor_user_id: Optional[UUID] = None,
    ) -> ProposalResponse:
        """
        Transitions proposal from 'draft' or 'revised' to 'submitted'.
        Locks version against silent modification.
        """
        pid_str = str(proposal_id)
        if pid_str not in _IN_MEMORY_PROPOSALS:
            raise NotFoundError(f"Proposal with ID '{proposal_id}' was not found.")

        proposal = _IN_MEMORY_PROPOSALS[pid_str]
        if proposal["status"] in ("confirmed", "cancelled"):
            raise ConflictError(f"Cannot submit proposal in final status '{proposal['status']}'.")

        now = datetime.now(timezone.utc).isoformat()
        current_v_num = proposal["current_version"]
        
        # Mark current version as submitted & immutable
        for v in proposal["versions"]:
            if v["version"] == current_v_num:
                v["status"] = "submitted"
                v["is_immutable"] = True

        proposal["status"] = "submitted"
        proposal["updated_at"] = now

        await self.audit.log_action(
            actor=submitted_by,
            action="proposal_submitted",
            entity="proposals",
            entity_id=proposal_id,
            actor_user_id=actor_user_id,
            payload={"version": current_v_num, "status": "submitted"},
        )

        return self._to_response(proposal)

    async def revise_proposal(
        self,
        proposal_id: UUID,
        req: ProposalReviseRequest,
        actor_user_id: Optional[UUID] = None,
    ) -> ProposalResponse:
        """
        Material Change Rule:
        Any change to specifications, pricing, or quantities generates a brand new version.
        Earlier versions are superseded and remain immutable for audit.
        Any approvals on the old version are NOT transferred.
        """
        pid_str = str(proposal_id)
        if pid_str not in _IN_MEMORY_PROPOSALS:
            raise NotFoundError(f"Proposal with ID '{proposal_id}' was not found.")

        proposal = _IN_MEMORY_PROPOSALS[pid_str]
        if proposal["status"] in ("confirmed", "cancelled"):
            raise ConflictError(f"Cannot revise proposal in final state '{proposal['status']}'.")

        now = datetime.now(timezone.utc).isoformat()
        old_version_num = proposal["current_version"]

        # 1. Supersede previous version (make strictly immutable)
        for v in proposal["versions"]:
            if v["version"] == old_version_num:
                v["status"] = "superseded"
                v["is_immutable"] = True

        # 2. Spawn new incremented version
        new_version_num = old_version_num + 1
        new_version_obj = {
            "version": new_version_num,
            "spec": req.new_spec.model_dump(),
            "status": "revised",
            "created_by": req.revised_by,
            "created_at": now,
            "coordinator_approval": None,  # Reset approvals: both parties must approve the same version
            "buyer_approval": None,
            "is_immutable": False,
        }

        proposal["versions"].append(new_version_obj)
        proposal["current_version"] = new_version_num
        proposal["status"] = "revised"
        proposal["updated_at"] = now

        await self.audit.log_action(
            actor=req.revised_by,
            action="proposal_revised",
            entity="proposals",
            entity_id=proposal_id,
            actor_user_id=actor_user_id,
            payload={
                "previous_version": old_version_num,
                "new_version": new_version_num,
                "reason": req.reason_for_revision,
            },
        )

        return self._to_response(proposal)

    async def approve_proposal_version(
        self,
        proposal_id: UUID,
        req: ProposalApproveRequest,
        actor_user_id: Optional[UUID] = None,
    ) -> ProposalResponse:
        """
        Two-Sided Approval State Machine:
        - Approver approves a SPECIFIC version number.
        - Guard: Approver CANNOT approve an outdated superseded version.
        - When both Coordinator and Buyer have approved the EXACT SAME VERSION:
          Status automatically transitions to 'confirmed', and a confirmed order is issued.
        """
        pid_str = str(proposal_id)
        if pid_str not in _IN_MEMORY_PROPOSALS:
            raise NotFoundError(f"Proposal with ID '{proposal_id}' was not found.")

        proposal = _IN_MEMORY_PROPOSALS[pid_str]
        current_v_num = proposal["current_version"]

        # Guard: Version must be the current active version
        if req.version < current_v_num:
            raise ConflictError(
                f"Cannot approve superseded version {req.version}. Active proposal version is {current_v_num}. "
                f"Both parties must review and approve the exact same active version."
            )
        elif req.version > current_v_num:
            raise ConflictError(f"Version {req.version} does not exist yet. Current version is {current_v_num}.")

        target_version = next((v for v in proposal["versions"] if v["version"] == current_v_num), None)
        if not target_version:
            raise NotFoundError(f"Version {current_v_num} not found in proposal.")

        now = datetime.now(timezone.utc).isoformat()
        approval_record = {
            "approver_role": req.approver_role,
            "approver_name": req.approver_name,
            "approver_user_id": str(actor_user_id) if actor_user_id else None,
            "approved_at": now,
            "notes": req.notes,
        }

        # Record approval
        if req.approver_role == "coordinator":
            if target_version["coordinator_approval"] is not None:
                raise ConflictError(f"Coordinator has already approved version {current_v_num}.")
            target_version["coordinator_approval"] = approval_record
        elif req.approver_role == "buyer":
            if target_version["buyer_approval"] is not None:
                raise ConflictError(f"Buyer has already approved version {current_v_num}.")
            target_version["buyer_approval"] = approval_record
        else:
            raise ConflictError(f"Invalid approver role '{req.approver_role}'. Must be 'coordinator' or 'buyer'.")

        # Two-Sided Agreement Check on EXACT SAME VERSION
        if target_version["coordinator_approval"] and target_version["buyer_approval"]:
            # BOTH parties agreed! Transition to confirmed order!
            target_version["status"] = "confirmed"
            target_version["is_immutable"] = True
            proposal["status"] = "confirmed"
            
            # Generate confirmed order ID
            confirmed_order_id = str(uuid4())
            proposal["confirmed_order_id"] = confirmed_order_id
            proposal["updated_at"] = now

            # Sync confirmed order to Supabase orders table if configured
            if self.db.base_url:
                try:
                    await self.db.insert_record("orders", {
                        "id": confirmed_order_id,
                        "proposal_id": pid_str,
                        "shg_id": proposal["shg_id"],
                        "total_amount": target_version["spec"]["total_price_inr"],
                        "status": "confirmed",
                        "is_custom": True,
                    }, use_service_role=True)
                except Exception as e:
                    logger.warning("Could not persist confirmed order to Supabase: %s", e)

            await self.audit.log_action(
                actor=req.approver_name,
                action="proposal_order_confirmed",
                entity="proposals",
                entity_id=proposal_id,
                actor_user_id=actor_user_id,
                payload={
                    "version": current_v_num,
                    "order_id": confirmed_order_id,
                    "total_price_inr": target_version["spec"]["total_price_inr"],
                },
            )
        else:
            # Partial approval
            proposal["status"] = f"approved_by_{req.approver_role}"
            proposal["updated_at"] = now

            await self.audit.log_action(
                actor=req.approver_name,
                action=f"proposal_approved_by_{req.approver_role}",
                entity="proposals",
                entity_id=proposal_id,
                actor_user_id=actor_user_id,
                payload={"version": current_v_num, "role": req.approver_role},
            )

        return self._to_response(proposal)

    async def create_sample_request(
        self,
        proposal_id: UUID,
        req: SampleRequestCreate,
        actor_user_id: Optional[UUID] = None,
    ) -> SampleResponse:
        """
        Sample Request Flow:
        Buyer requests a physical sample tied to a specific proposal specification version.
        Initial status: 'requested'.
        """
        pid_str = str(proposal_id)
        if pid_str not in _IN_MEMORY_PROPOSALS:
            raise NotFoundError(f"Proposal with ID '{proposal_id}' was not found.")

        proposal = _IN_MEMORY_PROPOSALS[pid_str]
        now = datetime.now(timezone.utc).isoformat()
        sample_id = str(uuid4())

        sample_record = {
            "id": sample_id,
            "proposal_id": pid_str,
            "spec_version": req.spec_version,
            "fee_inr": req.fee_inr,
            "status": "requested",
            "tracking_number": None,
            "feedback": None,
            "created_at": now,
            "updated_at": now,
        }

        _IN_MEMORY_SAMPLES.setdefault(pid_str, []).append(sample_record)

        if self.db.base_url:
            try:
                await self.db.insert_record("sample_requests", {
                    "id": sample_id,
                    "shg_id": proposal.get("shg_id"),
                    "spec_version": req.spec_version,
                    "fee_inr": req.fee_inr,
                    "status": "requested",
                }, use_service_role=True)
            except Exception as e:
                logger.warning("Could not persist sample request to Supabase: %s", e)

        await self.audit.log_action(
            actor="Buyer",
            action="sample_requested",
            entity="sample_requests",
            entity_id=UUID(sample_id),
            actor_user_id=actor_user_id,
            payload={"proposal_id": pid_str, "version": req.spec_version, "fee": req.fee_inr},
        )

        return SampleResponse(
            id=UUID(sample_id),
            proposal_id=proposal_id,
            spec_version=req.spec_version,
            fee_inr=req.fee_inr,
            status="requested",
            tracking_number=None,
            feedback=None,
            created_at=now,
            updated_at=now,
        )

    async def update_sample_status(
        self,
        proposal_id: UUID,
        sample_id: UUID,
        req: SampleStatusUpdateRequest,
        actor_user_id: Optional[UUID] = None,
    ) -> SampleResponse:
        """
        Advances sample lifecycle through production, dispatch, delivery, and approval.
        """
        pid_str = str(proposal_id)
        sid_str = str(sample_id)
        samples = _IN_MEMORY_SAMPLES.get(pid_str, [])
        sample = next((s for s in samples if s["id"] == sid_str), None)

        if not sample:
            raise NotFoundError(f"Sample request with ID '{sample_id}' not found.")

        now = datetime.now(timezone.utc).isoformat()
        sample["status"] = req.new_status
        sample["updated_at"] = now
        if req.tracking_number:
            sample["tracking_number"] = req.tracking_number
        if req.feedback:
            sample["feedback"] = req.feedback

        await self.audit.log_action(
            actor="User",
            action=f"sample_status_{req.new_status}",
            entity="sample_requests",
            entity_id=sample_id,
            actor_user_id=actor_user_id,
            payload={"new_status": req.new_status, "tracking_number": req.tracking_number},
        )

        return SampleResponse(
            id=sample_id,
            proposal_id=proposal_id,
            spec_version=sample["spec_version"],
            fee_inr=sample["fee_inr"],
            status=sample["status"],
            tracking_number=sample.get("tracking_number"),
            feedback=sample.get("feedback"),
            created_at=sample["created_at"],
            updated_at=now,
        )


proposal_service = ProposalService()
