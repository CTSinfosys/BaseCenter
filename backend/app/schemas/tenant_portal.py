"""
Tenant self-service portal schemas (customer-facing).

Distinct from Super Admin schemas — these power the /app tenant portal:
signup/onboarding, dashboard, module catalog & activation, and user/seat management.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ---------------------------------------------------------------------------
# Signup / onboarding
# ---------------------------------------------------------------------------
class TenantSignupRequest(BaseModel):
    """Public signup: creates a Tenant + owner User (tenant_admin)."""
    company_name: str
    full_name: Optional[str] = None
    email: EmailStr
    password: str


class TenantSignupResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    tenant_id: int
    tenant_name: str


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
class SeatUsage(BaseModel):
    allocated: int
    used: int
    available: int


class BillingStatus(BaseModel):
    stripe_configured: bool
    stripe_customer_id: Optional[str] = None
    active_paid_modules: int
    monthly_total_cents: int


class ActiveModuleInfo(BaseModel):
    subscription_id: int
    module_id: int
    name: str
    slug: str
    icon: Optional[str] = None
    is_free_module: bool
    status: str
    monthly_price: int


class TenantDashboard(BaseModel):
    tenant_id: int
    tenant_name: str
    status: str
    seats: SeatUsage
    billing: BillingStatus
    active_modules: List[ActiveModuleInfo]


# ---------------------------------------------------------------------------
# Module catalog (with per-tenant activation state)
# ---------------------------------------------------------------------------
class CatalogModule(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    monthly_price: int
    is_free_eligible: bool
    is_activated: bool
    subscription_status: Optional[str] = None
    subscription_id: Optional[int] = None
    stripe_ready: bool


class ActivateModuleRequest(BaseModel):
    module_id: int


class ActivateModuleResponse(BaseModel):
    """Returned by activation. If checkout_url is set, redirect the user to Stripe."""
    activated: bool
    requires_checkout: bool = False
    checkout_url: Optional[str] = None
    message: str


# ---------------------------------------------------------------------------
# Tenant user & seat management
# ---------------------------------------------------------------------------
class TenantUser(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    role: str
    is_active: bool
    is_owner: bool
    created_at: datetime
    # Phase 1H — set on invite responses. invite_link is only populated when
    # email delivery is unconfigured (so the link can be copied during local dev).
    invited: Optional[bool] = None
    invite_link: Optional[str] = None

    class Config:
        from_attributes = True


class TenantUserCreate(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    # Optional (Phase 1H): when omitted, the user is invited by email and sets
    # their own password via the invite link instead of being given one.
    password: Optional[str] = None
    role: str = "member"


class TenantUserList(BaseModel):
    users: List[TenantUser]
    seats: SeatUsage
