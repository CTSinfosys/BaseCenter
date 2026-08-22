"""
Stripe webhook handler.
Processes subscription lifecycle events and syncs them to the local database.

Phase 1G additions:
  * Idempotency: every processed event id is recorded in ``webhook_events``;
    duplicate deliveries are acknowledged but not re-processed.
  * Dunning: ``invoice.payment_failed`` -> ``past_due``; ``invoice.paid`` /
    ``invoice.payment_succeeded`` recovers a past_due/incomplete sub -> ``active``.
  * ``customer.subscription.updated`` now also syncs ``cancel_at_period_end``
    and maps the Stripe status through ``stripe_service.map_stripe_status``.
  * ``customer.subscription.deleted`` -> ``canceled`` (canonical spelling).
"""
from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.database import get_db
from app.services import stripe_service
from app.models.subscription import Subscription
from app.models.webhook_event import WebhookEvent

router = APIRouter()


@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Receive and process Stripe webhook events (idempotent)."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe_service.construct_webhook_event(db, payload, sig_header)
    except stripe_service.StripeNotConfiguredError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:  # noqa: BLE001 (includes SignatureVerificationError)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Webhook error: {str(e)}")

    event_id = event.get("id")
    event_type = event["type"]
    data = event["data"]["object"]

    # --- Idempotency guard ---------------------------------------------------
    if event_id:
        already = (
            db.query(WebhookEvent)
            .filter(WebhookEvent.event_id == event_id)
            .first()
        )
        if already:
            return {"received": True, "duplicate": True}

    # --- Dispatch ------------------------------------------------------------
    if event_type == "checkout.session.completed":
        _handle_checkout_completed(db, data)
    elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
        _handle_subscription_updated(db, data)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(db, data)
    elif event_type == "invoice.payment_failed":
        _handle_invoice_payment_failed(db, data)
    elif event_type in ("invoice.paid", "invoice.payment_succeeded"):
        _handle_invoice_paid(db, data)

    # --- Record processed event ---------------------------------------------
    if event_id:
        db.add(WebhookEvent(event_id=event_id, event_type=event_type))
        db.commit()

    return {"received": True}


def _handle_checkout_completed(db: Session, session):
    """Create/activate a subscription record after successful checkout."""
    metadata = session.get("metadata", {}) or {}
    tenant_id = metadata.get("tenant_id")
    module_id = metadata.get("module_id")
    stripe_sub_id = session.get("subscription")
    if not (tenant_id and module_id):
        return

    existing = (
        db.query(Subscription)
        .filter(
            Subscription.tenant_id == int(tenant_id),
            Subscription.module_id == int(module_id),
        )
        .first()
    )
    if existing:
        existing.stripe_subscription_id = stripe_sub_id
        existing.status = "active"
        existing.cancel_at_period_end = False
    else:
        db.add(
            Subscription(
                tenant_id=int(tenant_id),
                module_id=int(module_id),
                stripe_subscription_id=stripe_sub_id,
                status="active",
            )
        )
    db.commit()


def _handle_subscription_updated(db: Session, sub_obj):
    """Update subscription status, billing period and cancel schedule from Stripe."""
    stripe_sub_id = sub_obj.get("id")
    record = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == stripe_sub_id)
        .first()
    )
    if not record:
        return
    mapped = stripe_service.map_stripe_status(sub_obj.get("status"))
    if mapped:
        record.status = mapped
    record.cancel_at_period_end = bool(sub_obj.get("cancel_at_period_end", False))
    if sub_obj.get("current_period_start"):
        record.current_period_start = datetime.utcfromtimestamp(sub_obj["current_period_start"])
    if sub_obj.get("current_period_end"):
        record.current_period_end = datetime.utcfromtimestamp(sub_obj["current_period_end"])
    db.commit()


def _handle_subscription_deleted(db: Session, sub_obj):
    """Mark subscription canceled when deleted in Stripe."""
    stripe_sub_id = sub_obj.get("id")
    record = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == stripe_sub_id)
        .first()
    )
    if record:
        record.status = "canceled"
        record.cancel_at_period_end = False
        db.commit()


def _handle_invoice_payment_failed(db: Session, invoice):
    """Dunning: a failed payment moves the subscription to past_due."""
    stripe_sub_id = invoice.get("subscription")
    if not stripe_sub_id:
        return
    record = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == stripe_sub_id)
        .first()
    )
    if record:
        record.status = "past_due"
        db.commit()


def _handle_invoice_paid(db: Session, invoice):
    """Recovery: a successful payment restores a past_due/incomplete sub to active."""
    stripe_sub_id = invoice.get("subscription")
    if not stripe_sub_id:
        return
    record = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == stripe_sub_id)
        .first()
    )
    if record and record.status in ("past_due", "incomplete"):
        record.status = "active"
        db.commit()
