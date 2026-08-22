"""
Module schemas
"""
from pydantic import BaseModel
from typing import Optional


class ModuleBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    monthly_price: int = 500
    is_active: bool = True
    is_free_eligible: bool = True
    display_order: int = 0


class Module(ModuleBase):
    id: int
    stripe_product_id: Optional[str] = None
    stripe_price_id: Optional[str] = None

    class Config:
        from_attributes = True
