"""Audit log schemas (Phase 1H)."""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    actor_user_id: Optional[int] = None
    actor_email: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    meta: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuditLogList(BaseModel):
    items: List[AuditLogOut]
    total: int
    limit: int
    offset: int
