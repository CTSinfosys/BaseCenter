"""
Tenant management service (Phase 1D — SA portal).

Handles tenant CRUD, suspend/reactivate, seat allocation, and per-tenant
module enable/disable. Subscription state mirrors the existing Stripe
integration where present, but every operation works even when Stripe is
not configured (local-only subscription rows).
"""
from typing import List, Optional
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.tenant import Tenant
from app.models.user import User
from app.models.module import Module
from app.models.subscription import Subscription
from app.core.security import get_password_hash

ACTIVE_STATUSES = ("active", "trialing", "past_due")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _seats_used(db: Session, tenant_id: int) -> int:
    return (
        db.query(func.count(User.id))
        .filter(User.tenant_id == tenant_id)
        .scalar()
        or 0
    )


def _active_module_count(db: Session, tenant_id: int) -> int:
    return (
        db.query(func.count(Subscription.id))
        .filter(
            Subscription.tenant_id == tenant_id,
            Subscription.status.in_(ACTIVE_STATUSES),
        )
        .scalar()
        or 0
    )


def summarize(db: Session, tenant: Tenant) -> dict:
    """Build a TenantSummary-compatible dict."""
    owner = None
    if tenant.owner_id:
        owner = db.query(User).filter(User.id == tenant.owner_id).first()
    return {
        "id": tenant.id,
        "name": tenant.name,
        "subdomain": tenant.subdomain,
        "status": tenant.status,
        "is_active": tenant.is_active,
        "seats_allocated": tenant.seats_allocated,
        "seats_used": _seats_used(db, tenant.id),
        "active_module_count": _active_module_count(db, tenant.id),
        "owner": owner,
        "created_at": tenant.created_at,
    }


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------
def list_tenants(
    db: Session,
    search: Optional[str] = None,
    status: Optional[str] = None,
) -> List[dict]:
    q = db.query(Tenant)
    if search:
        like = f"%{search.lower()}%"
        q = q.filter(
            or_(
                func.lower(Tenant.name).like(like),
                func.lower(func.coalesce(Tenant.subdomain, "")).like(like),
            )
        )
    if status in ("active", "suspended"):
        q = q.filter(Tenant.status == status)
    tenants = q.order_by(Tenant.created_at.desc().nullslast(), Tenant.id.desc()).all()
    return [summarize(db, t) for t in tenants]


def get_tenant_detail(db: Session, tenant_id: int) -> Optional[dict]:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        return None

    data = summarize(db, tenant)
    data["users"] = db.query(User).filter(User.tenant_id == tenant.id).all()

    # Build a full module list showing subscription state per module
    subs = {
        s.module_id: s
        for s in db.query(Subscription).filter(Subscription.tenant_id == tenant.id).all()
    }
    modules = db.query(Module).order_by(Module.display_order).all()
    module_rows = []
    for m in modules:
        s = subs.get(m.id)
        module_rows.append(
            {
                "module_id": m.id,
                "module_name": m.name,
                "module_slug": m.slug,
                "monthly_price": m.monthly_price,
                "is_free_module": bool(s.is_free_module) if s else (m.monthly_price == 0),
                "subscription_id": s.id if s else None,
                "status": s.status if s else "none",
                "seats": s.seats if s else 0,
                "stripe_subscription_id": s.stripe_subscription_id if s else None,
                "enabled": bool(s and s.status in ACTIVE_STATUSES),
            }
        )
    data["modules"] = module_rows
    return data


# ---------------------------------------------------------------------------
# Mutations
# ---------------------------------------------------------------------------
def create_tenant(
    db: Session,
    name: str,
    subdomain: Optional[str] = None,
    seats_allocated: int = 5,
    owner_email: Optional[str] = None,
    owner_full_name: Optional[str] = None,
    owner_password: Optional[str] = None,
) -> Tenant:
    tenant = Tenant(
        name=name,
        subdomain=subdomain or None,
        seats_allocated=max(1, seats_allocated),
        status="active",
        is_active=True,
    )
    db.add(tenant)
    db.flush()  # get tenant.id

    if owner_email:
        existing = db.query(User).filter(User.email == owner_email).first()
        if existing:
            existing.tenant_id = tenant.id
            owner = existing
        else:
            owner = User(
                email=owner_email,
                full_name=owner_full_name,
                hashed_password=get_password_hash(owner_password or "changeme123"),
                is_active=True,
                is_superuser=False,
                tenant_id=tenant.id,
            )
            db.add(owner)
            db.flush()
        tenant.owner_id = owner.id

    db.commit()
    db.refresh(tenant)
    return tenant


def update_tenant(db: Session, tenant_id: int, **fields) -> Optional[Tenant]:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        return None
    if fields.get("name") is not None:
        tenant.name = fields["name"]
    if fields.get("subdomain") is not None:
        tenant.subdomain = fields["subdomain"] or None
    if fields.get("seats_allocated") is not None:
        tenant.seats_allocated = max(1, int(fields["seats_allocated"]))
    if fields.get("owner_id") is not None:
        tenant.owner_id = fields["owner_id"]
    db.commit()
    db.refresh(tenant)
    return tenant


def set_status(db: Session, tenant_id: int, active: bool) -> Optional[Tenant]:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        return None
    tenant.is_active = active
    tenant.status = "active" if active else "suspended"
    db.commit()
    db.refresh(tenant)
    return tenant


def set_seats(db: Session, tenant_id: int, seats_allocated: int) -> Optional[Tenant]:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        return None
    tenant.seats_allocated = max(1, int(seats_allocated))
    db.commit()
    db.refresh(tenant)
    return tenant


def enable_module(
    db: Session, tenant_id: int, module_id: int, seats: int = 1
) -> Subscription:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    module = db.query(Module).filter(Module.id == module_id).first()
    if not tenant or not module:
        raise ValueError("Tenant or module not found")

    sub = (
        db.query(Subscription)
        .filter(
            Subscription.tenant_id == tenant_id,
            Subscription.module_id == module_id,
        )
        .first()
    )
    if sub:
        sub.status = "active"
        sub.seats = max(1, int(seats))
    else:
        sub = Subscription(
            tenant_id=tenant_id,
            module_id=module_id,
            status="active",
            seats=max(1, int(seats)),
            is_free_module=(module.monthly_price == 0),
        )
        db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def disable_module(db: Session, tenant_id: int, module_id: int) -> Optional[Subscription]:
    sub = (
        db.query(Subscription)
        .filter(
            Subscription.tenant_id == tenant_id,
            Subscription.module_id == module_id,
        )
        .first()
    )
    if not sub:
        return None
    sub.status = "canceled"
    db.commit()
    db.refresh(sub)
    return sub
