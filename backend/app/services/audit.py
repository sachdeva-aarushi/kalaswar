from typing import Any, Dict, Optional
from uuid import UUID, uuid4
from app.adapters.supabase import SupabaseAdapter, supabase_adapter
from app.core.logging import get_request_id, logger


class AuditService:
    def __init__(self, adapter: Optional[SupabaseAdapter] = None):
        self.adapter = adapter or supabase_adapter

    async def log_action(
        self,
        actor: Optional[str] = None,
        action: str = "action",
        entity: Optional[str] = None,
        entity_id: Optional[Any] = None,
        actor_user_id: Optional[Any] = None,
        payload: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        request_id: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """
        Appends an immutable audit entry to action_audit_logs table.
        """
        actor_val = str(actor or kwargs.get("user_id") or "system")
        entity_val = entity or kwargs.get("entity_type")
        payload_val = payload or kwargs.get("details") or {}
        actor_uid = actor_user_id or kwargs.get("user_id")
        rid = request_id or get_request_id()
        record_id = str(uuid4())

        record = {
            "id": record_id,
            "actor": actor_val,
            "action": action,
            "entity": entity_val,
            "entity_type": entity_val,
            "entity_id": str(entity_id) if entity_id else None,
            "actor_user_id": str(actor_uid) if actor_uid else None,
            "payload": payload_val,
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
