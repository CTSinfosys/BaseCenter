"""
Website Builder module API (Phase 1F).

Tenant-scoped, prefix /api/v1/tenant/website-builder. Every endpoint is gated by
``require_active_module("website-builder")`` — the reusable module guard — which
returns 403 unless the tenant has an active subscription for this module, and
supplies the owning ``Tenant`` for strict data isolation.
"""
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.module_guard import require_active_module
from app.models.tenant import Tenant
from app.schemas.website import (
    WebsiteCreate,
    WebsiteUpdate,
    WebsiteOut,
    WebsiteDetail,
    PublishUpdate,
    BlockCreate,
    BlockUpdate,
    BlockOut,
    BlockReorder,
)
from app.services import website_service

router = APIRouter()

MODULE_SLUG = "website-builder"
_guard = require_active_module(MODULE_SLUG)


# ---------------------------------------------------------------------------
# Websites
# ---------------------------------------------------------------------------
@router.get("/websites", response_model=List[WebsiteOut])
async def list_websites(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(_guard),
):
    return website_service.list_websites(db, tenant)


@router.post(
    "/websites", response_model=WebsiteDetail, status_code=status.HTTP_201_CREATED
)
async def create_website(
    payload: WebsiteCreate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(_guard),
):
    return website_service.create_website(
        db, tenant, name=payload.name, slug=payload.slug, settings=payload.settings
    )


@router.get("/websites/{website_id}", response_model=WebsiteDetail)
async def get_website(
    website_id: int,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(_guard),
):
    return website_service.get_website(db, tenant, website_id)


@router.put("/websites/{website_id}", response_model=WebsiteDetail)
async def update_website(
    website_id: int,
    payload: WebsiteUpdate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(_guard),
):
    return website_service.update_website(
        db,
        tenant,
        website_id,
        name=payload.name,
        slug=payload.slug,
        settings=payload.settings,
    )


@router.delete("/websites/{website_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_website(
    website_id: int,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(_guard),
):
    website_service.delete_website(db, tenant, website_id)
    return None


@router.post("/websites/{website_id}/publish", response_model=WebsiteDetail)
async def set_publish(
    website_id: int,
    payload: PublishUpdate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(_guard),
):
    return website_service.set_published(db, tenant, website_id, payload.published)


# ---------------------------------------------------------------------------
# Blocks
# ---------------------------------------------------------------------------
@router.post(
    "/websites/{website_id}/blocks",
    response_model=BlockOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_block(
    website_id: int,
    payload: BlockCreate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(_guard),
):
    return website_service.add_block(
        db, tenant, website_id, payload.block_type, payload.content
    )


@router.put(
    "/websites/{website_id}/blocks/{block_id}", response_model=BlockOut
)
async def update_block(
    website_id: int,
    block_id: int,
    payload: BlockUpdate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(_guard),
):
    return website_service.update_block(
        db,
        tenant,
        website_id,
        block_id,
        block_type=payload.block_type,
        content=payload.content,
    )


@router.delete(
    "/websites/{website_id}/blocks/{block_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_block(
    website_id: int,
    block_id: int,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(_guard),
):
    website_service.delete_block(db, tenant, website_id, block_id)
    return None


@router.post(
    "/websites/{website_id}/blocks/reorder", response_model=List[BlockOut]
)
async def reorder_blocks(
    website_id: int,
    payload: BlockReorder,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(_guard),
):
    return website_service.reorder_blocks(db, tenant, website_id, payload.items)
