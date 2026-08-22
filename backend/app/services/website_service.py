"""
Website Builder service layer (Phase 1F).

Every tenant-scoped query filters by ``tenant_id`` for strict tenant isolation.
A tenant can only read/write its own websites and blocks; requesting another
tenant's website id returns 404 (existence is not leaked).
"""
import re
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.tenant import Tenant
from app.models.website import Website, WebsiteBlock


_ALLOWED_BLOCK_TYPES = {"heading", "text", "image", "button"}


def _slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "site"


def _unique_slug(db: Session, base: str, exclude_id: Optional[int] = None) -> str:
    """Return a globally-unique slug derived from ``base``."""
    base = _slugify(base)
    candidate = base
    n = 1
    while True:
        q = db.query(Website).filter(Website.slug == candidate)
        if exclude_id is not None:
            q = q.filter(Website.id != exclude_id)
        if not q.first():
            return candidate
        n += 1
        candidate = f"{base}-{n}"


def _validate_block_type(block_type: str) -> None:
    if block_type not in _ALLOWED_BLOCK_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid block_type. Allowed: {sorted(_ALLOWED_BLOCK_TYPES)}",
        )


# ---------------------------------------------------------------------------
# Websites
# ---------------------------------------------------------------------------
def list_websites(db: Session, tenant: Tenant) -> List[Website]:
    return (
        db.query(Website)
        .filter(Website.tenant_id == tenant.id)
        .order_by(Website.created_at.desc())
        .all()
    )


def create_website(
    db: Session,
    tenant: Tenant,
    name: str,
    slug: Optional[str] = None,
    settings: Optional[dict] = None,
) -> Website:
    slug = _unique_slug(db, slug or name)
    website = Website(
        tenant_id=tenant.id,
        name=name,
        slug=slug,
        settings=settings,
        published=False,
    )
    db.add(website)
    db.commit()
    db.refresh(website)
    return website


def get_website(db: Session, tenant: Tenant, website_id: int) -> Website:
    """Tenant-scoped fetch. 404 if not found OR owned by another tenant."""
    website = (
        db.query(Website)
        .filter(Website.id == website_id, Website.tenant_id == tenant.id)
        .first()
    )
    if not website:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Website not found."
        )
    return website


def update_website(
    db: Session,
    tenant: Tenant,
    website_id: int,
    name: Optional[str] = None,
    slug: Optional[str] = None,
    settings: Optional[dict] = None,
) -> Website:
    website = get_website(db, tenant, website_id)
    if name is not None:
        website.name = name
    if slug is not None:
        website.slug = _unique_slug(db, slug, exclude_id=website.id)
    if settings is not None:
        website.settings = settings
    db.commit()
    db.refresh(website)
    return website


def delete_website(db: Session, tenant: Tenant, website_id: int) -> None:
    website = get_website(db, tenant, website_id)
    db.delete(website)
    db.commit()


def set_published(
    db: Session, tenant: Tenant, website_id: int, published: bool
) -> Website:
    website = get_website(db, tenant, website_id)
    website.published = published
    db.commit()
    db.refresh(website)
    return website


# ---------------------------------------------------------------------------
# Blocks
# ---------------------------------------------------------------------------
def add_block(
    db: Session, tenant: Tenant, website_id: int, block_type: str, content: dict
) -> WebsiteBlock:
    website = get_website(db, tenant, website_id)
    _validate_block_type(block_type)
    max_pos = (
        db.query(WebsiteBlock)
        .filter(WebsiteBlock.website_id == website.id)
        .count()
    )
    block = WebsiteBlock(
        website_id=website.id,
        block_type=block_type,
        content=content or {},
        position=max_pos,
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


def _get_block(
    db: Session, tenant: Tenant, website_id: int, block_id: int
) -> WebsiteBlock:
    # get_website enforces tenant ownership first.
    get_website(db, tenant, website_id)
    block = (
        db.query(WebsiteBlock)
        .filter(
            WebsiteBlock.id == block_id,
            WebsiteBlock.website_id == website_id,
        )
        .first()
    )
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Block not found."
        )
    return block


def update_block(
    db: Session,
    tenant: Tenant,
    website_id: int,
    block_id: int,
    block_type: Optional[str] = None,
    content: Optional[dict] = None,
) -> WebsiteBlock:
    block = _get_block(db, tenant, website_id, block_id)
    if block_type is not None:
        _validate_block_type(block_type)
        block.block_type = block_type
    if content is not None:
        block.content = content
    db.commit()
    db.refresh(block)
    return block


def delete_block(
    db: Session, tenant: Tenant, website_id: int, block_id: int
) -> None:
    block = _get_block(db, tenant, website_id, block_id)
    db.delete(block)
    db.commit()
    # Re-pack positions to keep them contiguous.
    remaining = (
        db.query(WebsiteBlock)
        .filter(WebsiteBlock.website_id == website_id)
        .order_by(WebsiteBlock.position)
        .all()
    )
    for i, b in enumerate(remaining):
        b.position = i
    db.commit()


def reorder_blocks(
    db: Session, tenant: Tenant, website_id: int, items: List
) -> List[WebsiteBlock]:
    website = get_website(db, tenant, website_id)
    # Map block_id -> desired position, restricted to this website's blocks.
    valid_ids = {
        b.id
        for b in db.query(WebsiteBlock)
        .filter(WebsiteBlock.website_id == website.id)
        .all()
    }
    for item in items:
        if item.id in valid_ids:
            db.query(WebsiteBlock).filter(
                WebsiteBlock.id == item.id,
                WebsiteBlock.website_id == website.id,
            ).update({"position": item.position})
    db.commit()
    return (
        db.query(WebsiteBlock)
        .filter(WebsiteBlock.website_id == website.id)
        .order_by(WebsiteBlock.position)
        .all()
    )


# ---------------------------------------------------------------------------
# Public rendering (no auth) — published sites only
# ---------------------------------------------------------------------------
def get_public_website(db: Session, slug: str) -> Website:
    website = (
        db.query(Website)
        .filter(Website.slug == slug, Website.published == True)  # noqa: E712
        .first()
    )
    if not website:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found or not published.",
        )
    return website
