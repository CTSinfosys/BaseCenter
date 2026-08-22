"""
Tenant billing service (customer-facing) — Phase 1G.

Business logic for the tenant billing page: subscription lifecycle overview,
live invoices from Stripe, cancel-at-period-end / reactivate, and Stripe
Customer (Billing) Portal sessions.

Every path degrades gracefully when Stripe is not configured: overview and
invoices return empty/flagged data instead of erroring, and actions raise a
friendly HTTP 400 (mirroring ``tenant_portal_service.activate_module``).
"""
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.tenant import Tenant
from app.models.module import Module
from app.models.subscription import Subscription
from app.services import stripe_service, settings_service


# Local statuses that still grant access (mirrors module_guard: active only,
# but a cancel_at_period_end sub keeps status="active" until the period ends).
_ACTIVE_STATUSES = ("active",)


def _stripe_configured(db: Session) -> bool:
    return bool(settings_service.get_setting(db, settings_service.STRIPE_SECRET_KEY))


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------
def get_billing_overview(db: Session, tenant: Tenant) -> dict:
    """Return every subscription for the tenant with lifecycle metadata."""
    subs = (
        db.query(Subscription)
        .filter(Subscription.tenant_id == tenant.id)
        .order_by(Subscription.created_at)
        .all()
    )
    stripe_configured = _stripe_configured(db)

    subscriptions = []
    monthly_total = 0
    any_past_due = False
    for sub in subs:
        module = db.query(Module).filter(Module.id == sub.module_id).first()
        if not module:
            continue
        price = 0 if sub.is_free_module else module.monthly_price
        if sub.status == "past_due":
            any_past_due = True
        if sub.status == "active" and not sub.is_free_module:
            monthly_total += module.monthly_price
        subscriptions.append(
            {
                "subscription_id": sub.id,
                "module_id": module.id,
                "name": module.name,
                "slug": module.slug,
                "icon": module.icon,
                "is_free_module": sub.is_free_module,
                "status": sub.status,
                "monthly_price": price,
                "cancel_at_period_end": bool(sub.cancel_at_period_end),
                "current_period_end": sub.current_period_end,
                "has_stripe": bool(sub.stripe_subscription_id),
            }
        )

    return {
        "stripe_configured": stripe_configured,
        "has_customer": bool(tenant.stripe_customer_id),
        "subscriptions": subscriptions,
        "monthly_total_cents": monthly_total,
        "any_past_due": any_past_due,
    }


# ---------------------------------------------------------------------------
# Invoices (live from Stripe, read-only)
# ---------------------------------------------------------------------------
def list_invoices(db: Session, tenant: Tenant) -> List[dict]:
    """Fetch invoices for the tenant's Stripe customer. Empty when unavailable."""
    if not _stripe_configured(db) or not tenant.stripe_customer_id:
        return []
    try:
        raw = stripe_service.list_invoices(db, tenant.stripe_customer_id)
    except stripe_service.StripeNotConfiguredError:
        return []
    except Exception:  # noqa: BLE001 — read-only page must never 500 on Stripe hiccups
        return []

    invoices = []
    for inv in raw:
        created = inv.get("created")
        invoices.append(
            {
                "id": inv.get("id"),
                "number": inv.get("number"),
                "created": datetime.utcfromtimestamp(created) if created else None,
                "amount_cents": inv.get("amount_paid") or inv.get("amount_due") or 0,
                "currency": (inv.get("currency") or "usd").upper(),
                "status": inv.get("status"),
                "hosted_invoice_url": inv.get("hosted_invoice_url"),
                "invoice_pdf": inv.get("invoice_pdf"),
            }
        )
    return invoices


# ---------------------------------------------------------------------------
# Cancel / reactivate
# ---------------------------------------------------------------------------
def _get_owned_subscription(db: Session, tenant: Tenant, subscription_id: int) -> Subscription:
    sub = (
        db.query(Subscription)
        .filter(
            Subscription.id == subscription_id,
            Subscription.tenant_id == tenant.id,
        )
        .first()
    )
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found."
        )
    return sub


def cancel_subscription(db: Session, tenant: Tenant, subscription_id: int) -> dict:
    """Schedule cancellation at period end (paid) or deactivate immediately (free)."""
    sub = _get_owned_subscription(db, tenant, subscription_id)

    if sub.stripe_subscription_id:
        try:
            stripe_service.set_cancel_at_period_end(db, sub.stripe_subscription_id, True)
        except stripe_service.StripeNotConfiguredError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Billing is not configured. Please contact your administrator.",
            )
        except Exception as e:  # noqa: BLE001
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Payment provider error: {str(e)}",
            )
        sub.cancel_at_period_end = True
        # status stays "active" — access continues until the period ends.
        db.commit()
        return {
            "success": True,
            "message": "Subscription will cancel at the end of the current billing period.",
        }

    # Free / no Stripe subscription — deactivate directly.
    sub.status = "canceled"
    sub.cancel_at_period_end = False
    db.commit()
    return {"success": True, "message": "Subscription canceled."}


def reactivate_subscription(db: Session, tenant: Tenant, subscription_id: int) -> dict:
    """Undo a scheduled cancellation so the subscription renews normally."""
    sub = _get_owned_subscription(db, tenant, subscription_id)

    if sub.stripe_subscription_id:
        try:
            stripe_service.set_cancel_at_period_end(db, sub.stripe_subscription_id, False)
        except stripe_service.StripeNotConfiguredError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Billing is not configured. Please contact your administrator.",
            )
        except Exception as e:  # noqa: BLE001
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Payment provider error: {str(e)}",
            )

    sub.cancel_at_period_end = False
    if sub.status == "canceled":
        sub.status = "active"
    db.commit()
    return {"success": True, "message": "Subscription reactivated."}


# ---------------------------------------------------------------------------
# Stripe Customer (Billing) Portal
# ---------------------------------------------------------------------------
def create_portal_session(db: Session, tenant: Tenant) -> dict:
    """Create a Stripe Billing Portal session and return its URL."""
    if not _stripe_configured(db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Billing is not configured. Please contact your administrator.",
        )
    try:
        customer_id = stripe_service.get_or_create_customer(db, tenant)
        url = stripe_service.create_billing_portal_session(db, customer_id)
    except stripe_service.StripeNotConfiguredError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Billing is not configured. Please contact your administrator.",
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Payment provider error: {str(e)}",
        )
    return {"url": url}
