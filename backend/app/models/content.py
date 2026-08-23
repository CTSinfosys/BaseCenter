"""
Page content model (Phase 2B — lightweight CMS).

A ``PageSection`` is one editable block of a managed public page. Each page is
an ordered list of sections. Content is kept separate from theming (Phase 2A):
themes control the *look* via CSS variables, sections control the *content* and
*ordering*.

Two managed pages ("scopes"):
  * ``website`` — the public marketing site (route ``/``)
  * ``splash``  — the intro / module-selection screen (route ``/modules``)

The ``content`` column is a flexible JSON blob whose shape depends on ``type``,
so new block types can be added without a schema migration.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index
from sqlalchemy.sql import func
from sqlalchemy.types import JSON

from app.db.database import Base

# Managed pages.
CONTENT_PAGES = ("website", "splash")

# Supported section/block types. Extensible — add a type here and a matching
# default-content factory in content_service + a renderer on the frontend.
SECTION_TYPES = (
    "hero",
    "rich_text",
    "feature_grid",
    "modules_grid",
    "image",
    "image_text",
    "cta_banner",
    "steps",
    "pricing",
    "faq",
    "html",
)


class PageSection(Base):
    __tablename__ = "page_sections"

    id = Column(Integer, primary_key=True, index=True)
    # 'website' | 'splash'
    page = Column(String, nullable=False, index=True)
    # One of SECTION_TYPES.
    type = Column(String, nullable=False)
    # Ordering within the page (ascending).
    position = Column(Integer, nullable=False, default=0)
    # Hide/show on the public page without deleting.
    is_visible = Column(Boolean, nullable=False, default=True)
    # Block-specific fields (shape depends on ``type``).
    content = Column(JSON, nullable=False, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_page_sections_page_position", "page", "position"),
    )
