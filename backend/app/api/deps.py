"""
Shared API dependencies (authentication / authorization).
"""
from fastapi import Depends, HTTPException, status
from app.schemas.user import User
from app.api.v1.auth import get_current_user


async def get_current_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Allow access only to super admin (platform owner) accounts."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin privileges required.",
        )
    return current_user
