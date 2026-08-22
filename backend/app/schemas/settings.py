"""
Schemas for platform / Stripe settings
"""
from pydantic import BaseModel
from typing import Optional


class StripeConfig(BaseModel):
    """Masked view of Stripe configuration returned to the SA portal."""
    stripe_publishable_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None       # masked
    stripe_webhook_secret: Optional[str] = None   # masked
    stripe_mode: str = "test"
    is_configured: bool = False


class StripeConfigUpdate(BaseModel):
    """Payload to update Stripe settings. Omit/blank a field to leave it unchanged."""
    stripe_publishable_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    stripe_mode: Optional[str] = None


class StripeTestResult(BaseModel):
    success: bool
    message: str
    account_name: Optional[str] = None
    mode: Optional[str] = None
