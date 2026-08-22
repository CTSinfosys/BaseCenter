"""
Stripe service.
All Stripe API access reads the secret key from platform settings (DB) at call time,
so keys entered in the Super Admin portal take effect immediately.
"""
import stripe
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from app.core.config import settings
from app.services import settings_service


class StripeNotConfiguredError(Exception):
    """Raised when Stripe operations are attempted without a configured secret key."""
    pass


def _client(db: Session) -> "stripe":
    """Return the stripe module configured with the current secret key from DB."""
    secret_key = settings_service.get_setting(db, settings_service.STRIPE_SECRET_KEY)
    if not secret_key:
        raise StripeNotConfiguredError(
            "Stripe is not configured. Add your secret key in Super Admin > Settings."
        )
    stripe.api_key = secret_key
    return stripe


def test_connection(db: Session) -> Dict[str, Any]:
    """Verify the stored Stripe secret key by retrieving the account."""
    try:
        client = _client(db)
    except StripeNotConfiguredError as e:
        return {"success": False, "message": str(e)}

    try:
        account = client.Account.retrieve()
        mode = settings_service.get_setting(db, settings_service.STRIPE_MODE) or "test"
        name = account.get("business_profile", {}).get("name") or account.get("email") or account.get("id")
        return {
            "success": True,
            "message": "Successfully connected to Stripe.",
            "account_name": name,
            "mode": mode,
        }
    except stripe.error.AuthenticationError:
        return {"success": False, "message": "Invalid Stripe secret key (authentication failed)."}
    except Exception as e:  # noqa: BLE001
        return {"success": False, "message": f"Stripe error: {str(e)}"}


def ensure_stripe_product_and_price(db: Session, module) -> Dict[str, str]:
    """
    Ensure a Stripe Product and recurring monthly Price exist for a module.
    Returns dict with product_id and price_id.
    """
    client = _client(db)
    # Create product
    product = client.Product.create(
        name=f"BaseCenter — {module.name}",
        metadata={"module_id": str(module.id), "module_slug": module.slug},
    )
    price = client.Price.create(
        product=product.id,
        unit_amount=module.monthly_price,  # in cents
        currency="usd",
        recurring={"interval": "month"},
        metadata={"module_id": str(module.id)},
    )
    return {"product_id": product.id, "price_id": price.id}


def get_or_create_customer(db: Session, tenant) -> str:
    """Return the Stripe customer id for a tenant, creating one if needed."""
    client = _client(db)
    if tenant.stripe_customer_id:
        return tenant.stripe_customer_id
    customer = client.Customer.create(
        name=tenant.name,
        metadata={"tenant_id": str(tenant.id)},
    )
    tenant.stripe_customer_id = customer.id
    db.commit()
    return customer.id


def create_checkout_session(
    db: Session,
    tenant,
    price_id: str,
    module_id: int,
    quantity: int = 1,
) -> str:
    """Create a Stripe Checkout session for a module subscription; returns the URL."""
    client = _client(db)
    customer_id = get_or_create_customer(db, tenant)
    success_url = f"{settings.FRONTEND_URL}/admin/billing?status=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{settings.FRONTEND_URL}/admin/billing?status=cancelled"
    session = client.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": quantity}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"tenant_id": str(tenant.id), "module_id": str(module_id)},
    )
    return session.url


def cancel_subscription(db: Session, stripe_subscription_id: str) -> bool:
    """Cancel a Stripe subscription immediately."""
    client = _client(db)
    client.Subscription.delete(stripe_subscription_id)
    return True


def construct_webhook_event(db: Session, payload: bytes, sig_header: str):
    """Verify and construct a Stripe webhook event using the stored webhook secret."""
    webhook_secret = settings_service.get_setting(db, settings_service.STRIPE_WEBHOOK_SECRET)
    if not webhook_secret:
        raise StripeNotConfiguredError("Stripe webhook secret is not configured.")
    return stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
