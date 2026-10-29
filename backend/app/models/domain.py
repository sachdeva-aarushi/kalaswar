from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID


@dataclass
class AuditEntry:
    id: UUID
    actor: str
    action: str
    entity: Optional[str] = None
    entity_id: Optional[UUID] = None
    actor_user_id: Optional[UUID] = None
    payload: Dict[str, Any] = field(default_factory=dict)
    ip_address: Optional[str] = None
    request_id: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class UserSession:
    user_id: UUID
    email: Optional[str]
    roles: List[str]
    display_name: Optional[str] = None
