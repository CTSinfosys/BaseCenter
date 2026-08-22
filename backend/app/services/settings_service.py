"""
Platform settings service.
Manages key-value configuration with transparent encryption for secret values.
"""
import json
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
SIDEBAR_LABELS = "sidebar_labels"  # non-secret JSON of nav label overrides

# Email / SMTP settings (Phase 1H)
EMAIL_FROM_NAME = "email_from_name"
EMAIL_FROM_ADDRESS = "email_from_address"
EMAIL_SMTP_HOST = "email_smtp_host"
EMAIL_SMTP_PORT = "email_smtp_port"
EMAIL_SMTP_USER = "email_smtp_user"
EMAIL_SMTP_PASSWORD = "email_smtp_password"  # secret
EMAIL_SMTP_USE_TLS = "email_smtp_use_tls"  # "true"/"false"

SETTINGS_REGISTRY = {
    STRIPE_PUBLISHABLE_KEY: {"is_secret": False, "description": "Stripe publishable key (pk_...)"},
    STRIPE_SECRET_KEY: {"is_secret": True, "description": "Stripe secret key (sk_...)"},
    STRIPE_WEBHOOK_SECRET: {"is_secret": True, "description": "Stripe webhook signing secret (whsec_...)"},
    STRIPE_MODE: {"is_secret": False, "description": "Stripe mode: test or live"},
    SIDEBAR_LABELS: {"is_secret": False, "description": "Sidebar navigation label overrides (JSON)"},
    EMAIL_FROM_NAME: {"is_secret": False, "description": "Sender display name for outbound email"},
    EMAIL_FROM_ADDRESS: {"is_secret": False, "description": "Sender email address (From)"},
    EMAIL_SMTP_HOST: {"is_secret": False, "description": "SMTP server host"},
    EMAIL_SMTP_PORT: {"is_secret": False, "description": "SMTP server port"},
    EMAIL_SMTP_USER: {"is_secret": False, "description": "SMTP username"},
    EMAIL_SMTP_PASSWORD: {"is_secret": True, "description": "SMTP password"},
    EMAIL_SMTP_USE_TLS: {"is_secret": False, "description": "Use STARTTLS for SMTP (true/false)"},
}

# ---------------------------------------------------------------------------
# Sidebar navigation labels (per access level, per stable nav key)
# These are NON-secret display strings. Defaults mirror the current shells;
# Super Admins may override any label, and clearing an override falls back
# to the default below.
# ---------------------------------------------------------------------------
DEFAULT_SIDEBAR_LABELS: Dict[str, Dict[str, str]] = {
    "admin": {
        "dashboard": "Dashboard",
        "tenants": "Tenants",
        "settings": "Stripe Settings",
        "sidebar": "Sidebar Labels",
    },
    "tenant": {
        "dashboard": "Dashboard",
        "modules": "Modules",
        "team": "Team & Seats",
    },
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


# ---------------------------------------------------------------------------
# Email / SMTP configuration (Phase 1H)
# ---------------------------------------------------------------------------
def is_email_configured(db: Session) -> bool:
    """Email is 'configured' once we have an SMTP host and a From address."""
    return bool(get_setting(db, EMAIL_SMTP_HOST)) and bool(get_setting(db, EMAIL_FROM_ADDRESS))


def get_email_config(db: Session, reveal_secrets: bool = False) -> Dict[str, Optional[str]]:
    """Return the current email configuration. Password is masked unless reveal_secrets."""
    pw = get_setting(db, EMAIL_SMTP_PASSWORD)
    if pw and not reveal_secrets:
        pw_out: Optional[str] = "••••••••"
    else:
        pw_out = pw

    use_tls = get_setting(db, EMAIL_SMTP_USE_TLS)
    return {
        "from_name": get_setting(db, EMAIL_FROM_NAME),
        "from_address": get_setting(db, EMAIL_FROM_ADDRESS),
        "smtp_host": get_setting(db, EMAIL_SMTP_HOST),
        "smtp_port": get_setting(db, EMAIL_SMTP_PORT),
        "smtp_user": get_setting(db, EMAIL_SMTP_USER),
        "smtp_password": pw_out,
        "smtp_use_tls": (use_tls if use_tls is not None else "true"),
        "is_configured": is_email_configured(db),
    }


def update_email_config(
    db: Session,
    from_name: Optional[str] = None,
    from_address: Optional[str] = None,
    smtp_host: Optional[str] = None,
    smtp_port: Optional[str] = None,
    smtp_user: Optional[str] = None,
    smtp_password: Optional[str] = None,
    smtp_use_tls: Optional[str] = None,
) -> Dict[str, Optional[str]]:
    """Update email settings. Empty/None fields are left unchanged (per set_setting)."""
    if from_name is not None:
        set_setting(db, EMAIL_FROM_NAME, from_name)
    if from_address is not None:
        set_setting(db, EMAIL_FROM_ADDRESS, from_address)
    if smtp_host is not None:
        set_setting(db, EMAIL_SMTP_HOST, smtp_host)
    if smtp_port is not None:
        set_setting(db, EMAIL_SMTP_PORT, smtp_port)
    if smtp_user is not None:
        set_setting(db, EMAIL_SMTP_USER, smtp_user)
    if smtp_password is not None:
        set_setting(db, EMAIL_SMTP_PASSWORD, smtp_password)
    if smtp_use_tls is not None and smtp_use_tls != "":
        set_setting(db, EMAIL_SMTP_USE_TLS, smtp_use_tls)
    return get_email_config(db)




def get_sidebar_labels(
    db: Session, level: Optional[str] = None
) -> Dict[str, Dict[str, str]]:
    """
    Return effective sidebar labels = defaults merged with stored overrides.
    An override that is missing, empty, or blank falls back to the default.
    Pass ``level`` ("admin" | "tenant") to get only that access level's labels.
    """
    raw = get_setting(db, SIDEBAR_LABELS)
    overrides: Dict = {}
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                overrides = parsed
        except (ValueError, TypeError):
            overrides = {}

    merged: Dict[str, Dict[str, str]] = {}
    for lvl, defaults in DEFAULT_SIDEBAR_LABELS.items():
        lvl_over = overrides.get(lvl, {})
        if not isinstance(lvl_over, dict):
            lvl_over = {}
        merged[lvl] = {}
        for key, default_label in defaults.items():
            val = lvl_over.get(key)
            merged[lvl][key] = (
                val.strip() if isinstance(val, str) and val.strip() else default_label
            )

    if level is not None:
        return merged.get(level, {})
    return merged


def set_sidebar_labels(
    db: Session, overrides: Dict[str, Dict[str, str]]
) -> Dict[str, Dict[str, str]]:
    """
    Persist sidebar label overrides. Only values that differ from the default
    and are non-empty are stored; everything else resets to default. Storing
    ``{}`` (rather than an empty string) ensures a full reset persists.
    """
    clean: Dict[str, Dict[str, str]] = {}
    overrides = overrides or {}
    for lvl, defaults in DEFAULT_SIDEBAR_LABELS.items():
        lvl_in = overrides.get(lvl, {})
        if not isinstance(lvl_in, dict):
            lvl_in = {}
        clean_lvl: Dict[str, str] = {}
        for key, default_label in defaults.items():
            val = lvl_in.get(key)
            if isinstance(val, str) and val.strip() and val.strip() != default_label:
                clean_lvl[key] = val.strip()
        if clean_lvl:
            clean[lvl] = clean_lvl

    # Always write a non-empty JSON string so a reset ("{}") is persisted.
    set_setting(db, SIDEBAR_LABELS, json.dumps(clean))
    return get_sidebar_labels(db)
