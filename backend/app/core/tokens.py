"""
Short-lived signed tokens (Phase 1H).

Used for email verification, password reset and user-invite links. Tokens are
signed (not encrypted) with the app SECRET_KEY via itsdangerous, are scoped by a
per-purpose salt so a token minted for one flow can't be replayed in another,
and carry an embedded expiry checked at verification time.
"""
from typing import Optional

from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from app.core.config import settings

# Recognised token purposes (also used as the itsdangerous salt).
PURPOSE_VERIFY_EMAIL = "verify_email"
PURPOSE_PASSWORD_RESET = "password_reset"
PURPOSE_INVITE = "invite"


def _serializer(purpose: str) -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.SECRET_KEY, salt=purpose)


def generate_token(purpose: str, payload: dict) -> str:
    """Create a signed, timestamped token for the given purpose."""
    return _serializer(purpose).dumps(payload)


def verify_token(purpose: str, token: str, max_age_seconds: int) -> Optional[dict]:
    """
    Return the decoded payload if the token is valid, correctly scoped and not
    older than max_age_seconds; otherwise None.
    """
    if not token:
        return None
    try:
        return _serializer(purpose).loads(token, max_age=max_age_seconds)
    except (SignatureExpired, BadSignature, Exception):
        return None
