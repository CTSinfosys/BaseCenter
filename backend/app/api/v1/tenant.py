"""
Tenant self-service portal endpoints (customer-facing, prefix /api/v1/tenant).

Separate from the Super Admin portal (/api/v1/admin). Protected by tenant-auth
dependencies that require a tenant-scoped user (and, for admin actions, the
tenant_admin role). Public signup/login live here too.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.api.v1.auth import get_current_user
from app.schemas.user import User as UserSchema
from app.schemas.token import Token
from app.models.tenant import Tenant
from app.schemas.tenant_portal import (
    TenantSignupRequest,
    TenantSignupResponse,
    TenantDashboard,
    CatalogModule,
    ActivateModuleRequest,
    ActivateModuleResponse,
    TenantUser,
    TenantUserCreate,
    TenantUserList,
)
from app.schemas.billing import (
    BillingOverview,
    InvoiceList,
    PortalSessionResponse,
    MessageResponse,
)
from app.services import tenant_portal_service, user_service, billing_service
from app.core.security import create_access_token, create_refresh_token

router = APIRouter()


# ---------------------------------------------------------------------------
# Tenant-auth dependencies
# ---------------------------------------------------------------------------
async def get_current_tenant_user(
    current_user: UserSchema = Depends(get_current_user),
) -> UserSchema:
    """Require an authenticated user scoped to a tenant (not a platform super admin)."""
    if current_user.is_superuser and not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin accounts must use the admin portal.",
        )
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenant associated with this account.",
        )
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user."
        )
    return current_user


async def get_current_tenant_admin(
    current_user: UserSchema = Depends(get_current_tenant_user),
) -> UserSchema:
    """Require a tenant_admin (owner / manager) for privileged tenant actions."""
    if current_user.role != "tenant_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant administrator privileges required.",
        )
    return current_user


def _tenant_of(db: Session, current_user: UserSchema) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found."
        )
    return tenant


# ---------------------------------------------------------------------------
# Public: signup & login
# ---------------------------------------------------------------------------
@router.post(
    "/signup",
    response_model=TenantSignupResponse,
    status_code=status.HTTP_201_CREATED,
)
async def signup(payload: TenantSignupRequest, db: Session = Depends(get_db)):
    """Create a new tenant account + owner user, and return auth tokens."""
    tenant, owner = tenant_portal_service.signup_tenant(
        db,
        company_name=payload.company_name,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
    )
    return TenantSignupResponse(
        access_token=create_access_token(data={"sub": owner.id}),
        refresh_token=create_refresh_token(data={"sub": owner.id}),
        token_type="bearer",
        tenant_id=tenant.id,
        tenant_name=tenant.name,
    )


@router.post("/login", response_model=Token)
async def tenant_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Login for tenant users. Rejects platform super admins (they use /admin)."""
    user = user_service.authenticate_user(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )
    if not user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is not a tenant account.",
        )
    return {
        "access_token": create_access_token(data={"sub": user.id}),
        "refresh_token": create_refresh_token(data={"sub": user.id}),
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserSchema)
async def tenant_me(current_user: UserSchema = Depends(get_current_tenant_user)):
    """Current tenant user's profile."""
    return current_user


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@router.get("/dashboard", response_model=TenantDashboard)
async def dashboard(
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_user),
):
    tenant = _tenant_of(db, current_user)
    return tenant_portal_service.get_dashboard(db, tenant)


# ---------------------------------------------------------------------------
# Module catalog & activation
# ---------------------------------------------------------------------------
@router.get("/modules", response_model=List[CatalogModule])
async def catalog(
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_user),
):
    tenant = _tenant_of(db, current_user)
    return tenant_portal_service.get_catalog(db, tenant)


@router.post("/modules/activate", response_model=ActivateModuleResponse)
async def activate_module(
    payload: ActivateModuleRequest,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_admin),
):
    tenant = _tenant_of(db, current_user)
    return tenant_portal_service.activate_module(db, tenant, payload.module_id)


@router.post("/modules/{subscription_id}/deactivate")
async def deactivate_module(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_admin),
):
    tenant = _tenant_of(db, current_user)
    return tenant_portal_service.deactivate_module(db, tenant, subscription_id)


# ---------------------------------------------------------------------------
# Billing lifecycle & Stripe Customer Portal (Phase 1G) — tenant-admin only
# ---------------------------------------------------------------------------
@router.get("/billing", response_model=BillingOverview)
async def billing_overview(
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_admin),
):
    tenant = _tenant_of(db, current_user)
    return billing_service.get_billing_overview(db, tenant)


@router.get("/billing/invoices", response_model=InvoiceList)
async def billing_invoices(
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_admin),
):
    tenant = _tenant_of(db, current_user)
    return InvoiceList(invoices=billing_service.list_invoices(db, tenant))


@router.post(
    "/billing/subscriptions/{subscription_id}/cancel",
    response_model=MessageResponse,
)
async def billing_cancel_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_admin),
):
    tenant = _tenant_of(db, current_user)
    return billing_service.cancel_subscription(db, tenant, subscription_id)


@router.post(
    "/billing/subscriptions/{subscription_id}/reactivate",
    response_model=MessageResponse,
)
async def billing_reactivate_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_admin),
):
    tenant = _tenant_of(db, current_user)
    return billing_service.reactivate_subscription(db, tenant, subscription_id)


@router.post("/billing/portal", response_model=PortalSessionResponse)
async def billing_portal_session(
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_admin),
):
    tenant = _tenant_of(db, current_user)
    return billing_service.create_portal_session(db, tenant)


# ---------------------------------------------------------------------------
# User & seat management
# ---------------------------------------------------------------------------
@router.get("/users", response_model=TenantUserList)
async def list_users(
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_admin),
):
    tenant = _tenant_of(db, current_user)
    return tenant_portal_service.list_users(db, tenant)


@router.post("/users", response_model=TenantUser, status_code=status.HTTP_201_CREATED)
async def add_user(
    payload: TenantUserCreate,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_admin),
):
    tenant = _tenant_of(db, current_user)
    user = tenant_portal_service.create_user(
        db,
        tenant,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        role=payload.role,
    )
    return TenantUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        is_owner=(user.id == tenant.owner_id),
        created_at=user.created_at,
    )


@router.post("/users/{user_id}/deactivate", response_model=TenantUser)
async def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_admin),
):
    tenant = _tenant_of(db, current_user)
    user = tenant_portal_service.set_user_active(db, tenant, user_id, is_active=False)
    return TenantUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        is_owner=(user.id == tenant.owner_id),
        created_at=user.created_at,
    )


@router.post("/users/{user_id}/activate", response_model=TenantUser)
async def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_admin),
):
    tenant = _tenant_of(db, current_user)
    user = tenant_portal_service.set_user_active(db, tenant, user_id, is_active=True)
    return TenantUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        is_owner=(user.id == tenant.owner_id),
        created_at=user.created_at,
    )
