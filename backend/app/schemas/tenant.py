"""
Tenant / seat / subscription-admin schemas (Phase 1D — SA portal)
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ---------------------------------------------------------------------------
# Tenant CRUD
# ---------------------------------------------------------------------------
class TenantBase(BaseModel):
    name: str
    subdomain: Optional[str] = None
    seats_allocated: int = 5


class TenantCreate(TenantBase):
    # Optionally create the owner user together with the tenant
    owner_email: Optional[EmailStr] = None
    owner_full_name: Optional[str] = None
    owner_password: Optional[str] = None


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    subdomain: Optional[str] = None
    seats_allocated: Optional[int] = None
    owner_id: Optional[int] = None


class TenantOwner(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class TenantSummary(BaseModel):
    """Row in the tenant list."""
    id: int
    name: str
    subdomain: Optional[str] = None
    status: str
    is_active: bool
    seats_allocated: int
    seats_used: int
    active_module_count: int
    owner: Optional[TenantOwner] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TenantModuleSubscription(BaseModel):
    """A module and its subscription state for a given tenant."""
    module_id: int
    module_name: str
    module_slug: str
    monthly_price: int  # cents
    is_free_module: bool
    subscription_id: Optional[int] = None
    status: str  # active | canceled | past_due | none
    seats: int = 0
    stripe_subscription_id: Optional[str] = None
    enabled: bool = False


class TenantDetail(TenantSummary):
    users: List[TenantOwner] = []
    modules: List[TenantModuleSubscription] = []


# ---------------------------------------------------------------------------
# Seat / module admin actions
# ---------------------------------------------------------------------------
class SeatUpdate(BaseModel):
    seats_allocated: int


class ModuleToggle(BaseModel):
    seats: Optional[int] = 1


class MessageResponse(BaseModel):
    success: bool
    message: str


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------
class ModuleAdoption(BaseModel):
    module_id: int
    module_name: str
    monthly_price: int  # cents
    tenant_count: int  # active subscriptions
    mrr: int  # cents contributed by this module


class AnalyticsOverview(BaseModel):
    total_tenants: int
    active_tenants: int
    suspended_tenants: int
    total_users: int
    total_seats_allocated: int
    total_seats_used: int
    active_subscriptions: int
    mrr_cents: int
    module_adoption: List[ModuleAdoption]
