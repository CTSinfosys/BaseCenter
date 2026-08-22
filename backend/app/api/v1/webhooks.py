"""
Stripe webhook handler.
Processes subscription lifecycle events and syncs them to the local database.
"""
from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.database import get_db
from app.services import stripe_service
from app.models.subscription import Subscription
from app.models.tenant import Tenant

router = APIRouter()


@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Receive and process Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe_service.construct_webhook_event(db, payload, sig_header)
    except stripe_service.StripeNotConfiguredError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:  # noqa: BLE001 (includes SignatureVerificationError)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Webhook error: {str(e)}")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(db, data)
    elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
        _handle_subscription_updated(db, data)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(db, data)

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
    """Update subscription status and billing period from Stripe."""
    stripe_sub_id = sub_obj.get("id")
    record = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == stripe_sub_id)
        .first()
    )
    if not record:
        return
    record.status = sub_obj.get("status", record.status)
    if sub_obj.get("current_period_start"):
        record.current_period_start = datetime.utcfromtimestamp(sub_obj["current_period_start"])
    if sub_obj.get("current_period_end"):
        record.current_period_end = datetime.utcfromtimestamp(sub_obj["current_period_end"])
    db.commit()


def _handle_subscription_deleted(db: Session, sub_obj):
    """Mark subscription cancelled when deleted in Stripe."""
    stripe_sub_id = sub_obj.get("id")
    record = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == stripe_sub_id)
        .first()
    )
    if record:
        record.status = "cancelled"
        db.commit()
