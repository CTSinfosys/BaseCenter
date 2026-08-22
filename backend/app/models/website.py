"""
Website Builder module database models (Phase 1F).

These models are OWNED by the Website Builder module and are scoped to a tenant
via ``tenant_id``. They demonstrate the reusable module data-ownership pattern:
every module keeps its own tables, all rows carry the owning ``tenant_id`` and
the service layer always filters by it for strict tenant isolation.
"""
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Website(Base):
    """A simple website owned by a tenant, made up of ordered content blocks."""

    __tablename__ = "websites"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(
        Integer, ForeignKey("tenants.id"), nullable=False, index=True
    )
    name = Column(String, nullable=False)
    # Slug is globally unique so it can drive the public preview route /site/{slug}.
    slug = Column(String, unique=True, nullable=False, index=True)
    published = Column(Boolean, default=False, nullable=False)
    # Optional branding / meta stored as structured JSON (title, tagline, theme...).
    settings = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    blocks = relationship(
        "WebsiteBlock",
        back_populates="website",
        cascade="all, delete-orphan",
        order_by="WebsiteBlock.position",
    )


class WebsiteBlock(Base):
    """An ordered content section within a website (heading/text/image/button)."""

    __tablename__ = "website_blocks"

    id = Column(Integer, primary_key=True, index=True)
    website_id = Column(
        Integer, ForeignKey("websites.id"), nullable=False, index=True
    )
    # heading | text | image | button
    block_type = Column(String, nullable=False)
    # Structured JSON payload; shape depends on block_type.
    content = Column(JSON, nullable=False, default=dict)
    position = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    website = relationship("Website", back_populates="blocks")
