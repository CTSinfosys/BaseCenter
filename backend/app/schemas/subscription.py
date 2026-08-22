"""
Subscription schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CheckoutRequest(BaseModel):
    module_id: int
    quantity: int = 1


class CheckoutResponse(BaseModel):
    checkout_url: str


class Subscription(BaseModel):
    id: int
    tenant_id: int
    module_id: int
    is_free_module: bool
    stripe_subscription_id: Optional[str] = None
    status: str
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
