"""
Public theming endpoint (Phase 2A).

Each frontend surface fetches the active (default) theme tokens for its scope
from here — no authentication required — and applies them live via CSS
variables. Mirrors the public sidebar-labels pattern.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.theme import ActiveThemeOut
from app.services import theme_service

router = APIRouter()


@router.get("/active", response_model=ActiveThemeOut)
async def get_active_theme(
    scope: str = Query("website", description="website | splash | app"),
    db: Session = Depends(get_db),
):
    """Return the effective token set of the scope's default theme.

    Never 500s: unknown scopes and empty scopes fall back to the baked-in
    baseline tokens.
    """
    tokens = theme_service.get_active_tokens(db, scope)
    return ActiveThemeOut(scope=scope, tokens=tokens)
