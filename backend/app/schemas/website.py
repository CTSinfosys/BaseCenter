"""
Website Builder module schemas (Phase 1F).
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Blocks
# ---------------------------------------------------------------------------
class BlockBase(BaseModel):
    block_type: str  # heading | text | image | button
    content: Dict[str, Any] = {}


class BlockCreate(BlockBase):
    pass


class BlockUpdate(BaseModel):
    block_type: Optional[str] = None
    content: Optional[Dict[str, Any]] = None


class BlockOut(BlockBase):
    id: int
    website_id: int
    position: int

    class Config:
        from_attributes = True


class BlockReorderItem(BaseModel):
    id: int
    position: int


class BlockReorder(BaseModel):
    items: List[BlockReorderItem]


# ---------------------------------------------------------------------------
# Websites
# ---------------------------------------------------------------------------
class WebsiteBase(BaseModel):
    name: str
    slug: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class WebsiteCreate(WebsiteBase):
    pass


class WebsiteUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class PublishUpdate(BaseModel):
    published: bool


class WebsiteOut(BaseModel):
    id: int
    tenant_id: int
    name: str
    slug: str
    published: bool
    settings: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WebsiteDetail(WebsiteOut):
    blocks: List[BlockOut] = []


# ---------------------------------------------------------------------------
# Public (read-only) rendering payload
# ---------------------------------------------------------------------------
class PublicWebsite(BaseModel):
    name: str
    slug: str
    settings: Optional[Dict[str, Any]] = None
    blocks: List[BlockOut] = []

    class Config:
        from_attributes = True
