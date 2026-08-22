"""
Password-strength enforcement (Phase 1H).

Applied on signup, password reset and user creation/invite. Kept intentionally
simple and deterministic so it is easy to reason about and doesn't block
legitimate tests: minimum length plus at least one letter and one digit.
"""
from fastapi import HTTPException, status

MIN_PASSWORD_LENGTH = 8


def validate_password_strength(password: str) -> None:
    """Raise HTTP 400 if the password does not meet minimum strength rules."""
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters long.",
        )
    if not any(c.isalpha() for c in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one letter.",
        )
    if not any(c.isdigit() for c in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number.",
        )
