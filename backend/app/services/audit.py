from typing import Any, Dict, Optional
from uuid import UUID, uuid4
from app.adapters.supabase import SupabaseAdapter, supabase_adapter
from app.core.logging import get_request_id, logger


class AuditService:
    def __init__(self, adapter: Optional[SupabaseAdapter] = None):
        self.adapter = adapter or supabase_adapter

    async def log_action(
        self,
        actor: str,
        action: str,
        entity: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        actor_user_id: Optional[UUID] = None,
        payload: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Appends an immutable audit entry to action_audit_logs table.
        """
        rid = request_id or get_request_id()
        record_id = str(uuid4())

        record = {
            "id": record_id,
            "actor": actor,
            "action": action,
            "entity": entity,
            "entity_type": entity,
            "entity_id": str(entity_id) if entity_id else None,
            "actor_user_id": str(actor_user_id) if actor_user_id else None,
            "payload": payload or {},
            "request_id": rid,
        }
        if ip_address:
            record["ip_address"] = ip_address

        logger.info(
            "AUDIT LOG: actor='%s', action='%s', entity='%s', entity_id='%s', req='%s'",
            actor, action, entity, entity_id, rid
        )

        try:
            inserted = await self.adapter.insert_record("action_audit_logs", record, use_service_role=True)
            return inserted
        except Exception as e:
            logger.error("Failed to write to action_audit_logs: %s", e)
            # Return memory record so business action isn't aborted
            return record


audit_service = AuditService()
