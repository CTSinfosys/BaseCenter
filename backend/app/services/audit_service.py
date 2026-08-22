"""
Audit logging service (Phase 1H).

record() writes an audit_logs row for a security/admin-sensitive action.
list_logs() returns a filtered, paginated view for the Super Admin audit page.

Metadata is JSON-encoded and must never contain secrets/passwords — callers are
responsible for passing only non-sensitive fields.
"""
import json
import logging
from datetime import datetime, date
from typing import Optional, Tuple, List

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog

logger = logging.getLogger("basecenter.audit")


def client_ip(request: Optional[Request]) -> Optional[str]:
    """Best-effort client IP: X-Forwarded-For first hop, else the socket peer."""
    if request is None:
        return None
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def record(
    db: Session,
    action: str,
    actor_user=None,
    actor_email: Optional[str] = None,
    actor_role: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id=None,
    meta: Optional[dict] = None,
    ip: Optional[str] = None,
    request: Optional[Request] = None,
) -> Optional[AuditLog]:
    """
    Persist an audit entry. Never raises into the caller's request flow — audit
    failures are logged and swallowed so they can't break primary actions.
    """
    try:
        if actor_user is not None:
            actor_id = getattr(actor_user, "id", None)
            actor_email = actor_email or getattr(actor_user, "email", None)
            actor_role = actor_role or (
                "super_admin" if getattr(actor_user, "is_superuser", False)
                else getattr(actor_user, "role", None)
            )
        else:
            actor_id = None

        if ip is None and request is not None:
            ip = client_ip(request)

        entry = AuditLog(
            actor_user_id=actor_id,
            actor_email=actor_email,
            actor_role=actor_role,
            action=action,
            target_type=target_type,
            target_id=(str(target_id) if target_id is not None else None),
            meta=(json.dumps(meta) if meta else None),
            ip_address=ip,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry
    except Exception as exc:  # noqa: BLE001
        logger.error("[audit:error] failed to record action=%s error=%s", action, exc)
        try:
            db.rollback()
        except Exception:
            pass
        return None


def _parse_date(value) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day)
    try:
        return datetime.fromisoformat(str(value))
    except Exception:
        return None


def list_logs(
    db: Session,
    actor: Optional[str] = None,
    action: Optional[str] = None,
    date_from=None,
    date_to=None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[AuditLog], int]:
    """Return (items, total) of audit entries matching the filters, newest first."""
    q = db.query(AuditLog)
    if actor:
        q = q.filter(AuditLog.actor_email.ilike(f"%{actor}%"))
    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))
    df = _parse_date(date_from)
    if df:
        q = q.filter(AuditLog.created_at >= df)
    dt = _parse_date(date_to)
    if dt:
        # inclusive end-of-day
        q = q.filter(AuditLog.created_at < datetime(dt.year, dt.month, dt.day, 23, 59, 59))
    total = q.count()
    items = (
        q.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return items, total
