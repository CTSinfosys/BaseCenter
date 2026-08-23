"""
Theme database model (Phase 2A — DB-driven theming).

A Theme is a named set of design tokens scoped to one of three surfaces of the
platform:

  * ``website`` — the public marketing site (``/`` and public pages)
  * ``splash``  — the intro / module-selection screen (``/modules``)
  * ``app``     — the internal authenticated portals (``/admin`` and ``/app``)

Exactly one theme per scope is the *default* (the effective/active one applied
live). The token set is stored as a flexible JSON blob so it can be extended in
later phases without a schema migration.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index
from sqlalchemy.sql import func
from sqlalchemy.types import JSON
from app.db.database import Base

# Allowed scopes for a theme.
THEME_SCOPES = ("website", "splash", "app")


class Theme(Base):
    __tablename__ = "themes"

    id = Column(Integer, primary_key=True, index=True)
    # 'website' | 'splash' | 'app'
    scope = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    # Exactly one default per scope (enforced in the service layer).
    is_default = Column(Boolean, nullable=False, default=False)
    # Full design-token set (colors, typography, radius, spacing, etc.).
    tokens = Column(JSON, nullable=False, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_themes_scope_default", "scope", "is_default"),
    )
