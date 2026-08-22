"""
Platform settings service.
Manages key-value configuration with transparent encryption for secret values.
"""
from sqlalchemy.orm import Session
from app.models.setting import PlatformSetting
from app.core.encryption import encrypt_value, decrypt_value
from typing import Optional, Dict

# Registry of known settings keys.
# is_secret=True => value encrypted at rest and masked in API responses.
STRIPE_PUBLISHABLE_KEY = "stripe_publishable_key"
STRIPE_SECRET_KEY = "stripe_secret_key"
STRIPE_WEBHOOK_SECRET = "stripe_webhook_secret"
STRIPE_MODE = "stripe_mode"  # "test" or "live"

SETTINGS_REGISTRY = {
    STRIPE_PUBLISHABLE_KEY: {"is_secret": False, "description": "Stripe publishable key (pk_...)"},
    STRIPE_SECRET_KEY: {"is_secret": True, "description": "Stripe secret key (sk_...)"},
    STRIPE_WEBHOOK_SECRET: {"is_secret": True, "description": "Stripe webhook signing secret (whsec_...)"},
    STRIPE_MODE: {"is_secret": False, "description": "Stripe mode: test or live"},
}


def get_setting(db: Session, key: str) -> Optional[str]:
    """Return the decrypted plaintext value for a setting key, or None."""
    row = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    if not row or row.value is None:
        return None
    if row.is_secret:
        return decrypt_value(row.value)
    return row.value


def set_setting(db: Session, key: str, value: Optional[str]) -> PlatformSetting:
    """Create or update a setting. Encrypts value when the key is registered as secret."""
    meta = SETTINGS_REGISTRY.get(key, {"is_secret": False, "description": None})
    is_secret = meta["is_secret"]
    stored_value = None
    if value is not None and value != "":
        stored_value = encrypt_value(value) if is_secret else value

    row = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    if row:
        # Only overwrite when a non-empty value is provided (empty => leave unchanged)
        if value is not None and value != "":
            row.value = stored_value
            row.is_secret = is_secret
            row.description = meta["description"]
    else:
        row = PlatformSetting(
            key=key,
            value=stored_value,
            is_secret=is_secret,
            description=meta["description"],
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_stripe_config(db: Session, reveal_secrets: bool = False) -> Dict[str, Optional[str]]:
    """
    Return the current Stripe configuration.
    Secret values are masked unless reveal_secrets=True.
    """
    def masked(key: str) -> Optional[str]:
        val = get_setting(db, key)
        if val is None:
            return None
        if reveal_secrets:
            return val
        # Mask: show last 4 chars only
        if len(val) <= 4:
            return "••••"
        return "••••••••" + val[-4:]

    return {
        "stripe_publishable_key": get_setting(db, STRIPE_PUBLISHABLE_KEY),  # not secret
        "stripe_secret_key": masked(STRIPE_SECRET_KEY),
        "stripe_webhook_secret": masked(STRIPE_WEBHOOK_SECRET),
        "stripe_mode": get_setting(db, STRIPE_MODE) or "test",
        "is_configured": bool(get_setting(db, STRIPE_SECRET_KEY)),
    }


def update_stripe_config(
    db: Session,
    publishable_key: Optional[str] = None,
    secret_key: Optional[str] = None,
    webhook_secret: Optional[str] = None,
    mode: Optional[str] = None,
) -> Dict[str, Optional[str]]:
    """Update Stripe settings. Empty/None fields are left unchanged."""
    if publishable_key is not None:
        set_setting(db, STRIPE_PUBLISHABLE_KEY, publishable_key)
    if secret_key is not None:
        set_setting(db, STRIPE_SECRET_KEY, secret_key)
    if webhook_secret is not None:
        set_setting(db, STRIPE_WEBHOOK_SECRET, webhook_secret)
    if mode is not None and mode != "":
        set_setting(db, STRIPE_MODE, mode)
    return get_stripe_config(db)
