"""Pydantic schemas for the theming system (Phase 2A)."""
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ThemeBase(BaseModel):
    name: str
    tokens: Dict[str, Any] = Field(default_factory=dict)


class ThemeCreate(ThemeBase):
    scope: str
    is_default: bool = False


class ThemeUpdate(BaseModel):
    name: Optional[str] = None
    tokens: Optional[Dict[str, Any]] = None


class ThemeDuplicate(BaseModel):
    name: Optional[str] = None


class ThemeOut(BaseModel):
    id: int
    scope: str
    name: str
    is_default: bool
    tokens: Dict[str, Any]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ActiveThemeOut(BaseModel):
    """Public payload for the active theme of a scope."""
    scope: str
    tokens: Dict[str, Any]
