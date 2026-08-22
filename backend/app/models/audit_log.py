"""
Audit log model (Phase 1H) — records security- and admin-sensitive actions.

Stores the acting user (id/email/role snapshot so the record survives user
deletion), the action performed, an optional target (type + id), free-form
JSON metadata, the client IP, and a timestamp.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.db.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_email = Column(String, nullable=True)
    actor_role = Column(String, nullable=True)
    action = Column(String, nullable=False, index=True)
    target_type = Column(String, nullable=True)
    target_id = Column(String, nullable=True)
    # JSON-encoded metadata (never contains secrets/passwords)
    meta = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
