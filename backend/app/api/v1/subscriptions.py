"""
Subscription endpoints — Stripe checkout, cancellation, and listing.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.api.v1.auth import get_current_user
from app.schemas.user import User
from app.schemas.subscription import CheckoutRequest, CheckoutResponse, Subscription as SubscriptionSchema
from app.models.module import Module
from app.models.tenant import Tenant
from app.models.subscription import Subscription
from app.services import stripe_service

router = APIRouter()


def _get_tenant_for_user(db: Session, user: User) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first() if user.tenant_id else None
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tenant associated with this account.",
        )
    return tenant


@router.get("", response_model=List[SubscriptionSchema])
async def list_my_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the current tenant's subscriptions."""
    if not current_user.tenant_id:
        return []
    return db.query(Subscription).filter(Subscription.tenant_id == current_user.tenant_id).all()


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe Checkout session to subscribe to a paid module."""
    tenant = _get_tenant_for_user(db, current_user)
    module = db.query(Module).filter(Module.id == payload.module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")
    if not module.stripe_price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This module is not yet synced to Stripe. Ask an admin to sync modules.",
        )

    try:
        url = stripe_service.create_checkout_session(
            db, tenant, module.stripe_price_id, module.id, payload.quantity
        )
    except stripe_service.StripeNotConfiguredError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Stripe error: {str(e)}")

    return CheckoutResponse(checkout_url=url)


@router.post("/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a subscription belonging to the current tenant."""
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found.")
    if sub.tenant_id != current_user.tenant_id and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")
    if sub.is_free_module:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Free module cannot be cancelled.")

    if sub.stripe_subscription_id:
        try:
            stripe_service.cancel_subscription(db, sub.stripe_subscription_id)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Stripe error: {str(e)}")

    sub.status = "cancelled"
    db.commit()
    return {"success": True, "message": "Subscription cancelled."}
