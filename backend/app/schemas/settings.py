"""
Schemas for platform / Stripe settings
"""
from pydantic import BaseModel
from typing import Optional, Dict


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


class SidebarLabelsConfig(BaseModel):
    """Effective sidebar labels (defaults merged with overrides) per access level."""
    admin: Dict[str, str]
    tenant: Dict[str, str]


class SidebarLabelsUpdate(BaseModel):
    """
    Override payload. Any missing/blank value falls back to the default for that
    nav key. Send an empty object to reset all labels for that access level.
    """
    admin: Optional[Dict[str, str]] = None
    tenant: Optional[Dict[str, str]] = None
