"""
Symmetric encryption helpers for secrets stored at rest (e.g. Stripe secret keys).
Uses Fernet (AES-128-CBC + HMAC) with a key derived from SETTINGS_ENCRYPTION_KEY.
"""
import base64
import hashlib
from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings


def _get_fernet() -> Fernet:
    """Derive a stable Fernet key from the configured encryption secret."""
    raw = settings.SETTINGS_ENCRYPTION_KEY.encode("utf-8")
    # Derive a 32-byte key and url-safe base64 encode it for Fernet
    digest = hashlib.sha256(raw).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_value(plaintext: str) -> str:
    """Encrypt a plaintext string, returning a token string."""
    if plaintext is None:
        return None
    f = _get_fernet()
    return f.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_value(token: str) -> str:
    """Decrypt a token string back to plaintext. Returns None on failure."""
    if token is None:
        return None
    f = _get_fernet()
    try:
        return f.decrypt(token.encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError):
        return None
