"""Pydantic schemas for the content editor (Phase 2B — lightweight CMS)."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SectionBase(BaseModel):
    type: str
    content: Dict[str, Any] = Field(default_factory=dict)
    is_visible: bool = True


class SectionCreate(BaseModel):
    """Add a section of a given type; content defaults are filled server-side."""
    type: str
    content: Optional[Dict[str, Any]] = None
    is_visible: bool = True
    # Optional insert position; appended to the end when omitted.
    position: Optional[int] = None


class SectionUpdate(BaseModel):
    content: Optional[Dict[str, Any]] = None
    type: Optional[str] = None


class VisibilityUpdate(BaseModel):
    is_visible: bool


class ReorderRequest(BaseModel):
    """Ordered list of section ids representing the new top-to-bottom order."""
    section_ids: List[int]


class SectionOut(BaseModel):
    id: int
    page: str
    type: str
    position: int
    is_visible: bool
    content: Dict[str, Any]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PublicSection(BaseModel):
    """Lightweight public payload (visible sections only)."""
    id: int
    type: str
    content: Dict[str, Any]

    class Config:
        from_attributes = True


class SectionTypeInfo(BaseModel):
    """Describes a section type for the editor's 'Add section' picker."""
    type: str
    label: str
    description: str


class MediaUploadOut(BaseModel):
    url: str
    filename: str
    size: int
    content_type: str
