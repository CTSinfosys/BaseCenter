"""
Platform analytics service (Phase 1D — SA portal).

Computes platform-wide metrics: tenant counts, users/seats, module adoption,
and an MRR estimate derived from active module subscriptions.
"""
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.tenant import Tenant
from app.models.user import User
from app.models.module import Module
from app.models.subscription import Subscription

ACTIVE_STATUSES = ("active", "trialing", "past_due")


def overview(db: Session) -> dict:
    total_tenants = db.query(func.count(Tenant.id)).scalar() or 0
    active_tenants = (
        db.query(func.count(Tenant.id)).filter(Tenant.status == "active").scalar() or 0
    )
    suspended_tenants = total_tenants - active_tenants

    total_users = db.query(func.count(User.id)).scalar() or 0
    total_seats_allocated = db.query(func.coalesce(func.sum(Tenant.seats_allocated), 0)).scalar() or 0
    # Seats used = users that belong to a tenant
    total_seats_used = (
        db.query(func.count(User.id)).filter(User.tenant_id.isnot(None)).scalar() or 0
    )

    active_subs = (
        db.query(func.count(Subscription.id))
        .filter(Subscription.status.in_(ACTIVE_STATUSES))
        .scalar()
        or 0
    )

    # Module adoption + MRR: for each module, count active paid subscriptions
    modules = db.query(Module).order_by(Module.display_order).all()
    module_adoption = []
    mrr_cents = 0
    for m in modules:
        rows = (
            db.query(Subscription)
            .filter(
                Subscription.module_id == m.id,
                Subscription.status.in_(ACTIVE_STATUSES),
            )
            .all()
        )
        tenant_count = len(rows)
        # MRR contribution = price * seats across active subscriptions (free modules = 0)
        module_mrr = sum(m.monthly_price * max(1, r.seats or 1) for r in rows) if m.monthly_price else 0
        mrr_cents += module_mrr
        module_adoption.append(
            {
                "module_id": m.id,
                "module_name": m.name,
                "monthly_price": m.monthly_price,
                "tenant_count": tenant_count,
                "mrr": module_mrr,
            }
        )

    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "suspended_tenants": suspended_tenants,
        "total_users": total_users,
        "total_seats_allocated": int(total_seats_allocated),
        "total_seats_used": total_seats_used,
        "active_subscriptions": active_subs,
        "mrr_cents": mrr_cents,
        "module_adoption": module_adoption,
    }
