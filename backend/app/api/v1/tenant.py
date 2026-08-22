"""
Tenant self-service portal endpoints (customer-facing, prefix /api/v1/tenant).

Separate from the Super Admin portal (/api/v1/admin). Protected by tenant-auth
dependencies that require a tenant-scoped user (and, for admin actions, the
tenant_admin role). Public signup/login live here too.
"""
import secrets

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.api.v1.auth import get_current_user
from app.schemas.user import User as UserSchema
from app.schemas.token import Token
from app.schemas.auth_extra import (
    PasswordResetRequest,
    PasswordResetConfirm,
    VerifyEmailRequest,
    ResendVerificationRequest,
    SimpleMessage,
)
from app.models.tenant import Tenant
from app.models.user import User as UserModel
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
from app.services import (
    tenant_portal_service,
    user_service,
    billing_service,
    email_service,
    audit_service,
)
from app.core.security import create_access_token, create_refresh_token, get_password_hash
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.passwords import validate_password_strength
from app.core.tokens import (
    generate_token,
    verify_token,
    PURPOSE_VERIFY_EMAIL,
    PURPOSE_PASSWORD_RESET,
    PURPOSE_INVITE,
)

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
@limiter.limit(settings.RATE_LIMIT_SIGNUP)
async def signup(payload: TenantSignupRequest, request: Request, db: Session = Depends(get_db)):
    """Create a new tenant account + owner user, and return auth tokens."""
    validate_password_strength(payload.password)
    tenant, owner = tenant_portal_service.signup_tenant(
        db,
        company_name=payload.company_name,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
    )
    # Send email verification (logs the link when SMTP is unconfigured).
    email_service.send_verification_email(db, owner)
    audit_service.record(
        db,
        action="tenant.signup",
        actor_user=owner,
        target_type="tenant",
        target_id=tenant.id,
        meta={"company_name": payload.company_name},
        request=request,
    )
    return TenantSignupResponse(
        access_token=create_access_token(data={"sub": owner.id}),
        refresh_token=create_refresh_token(data={"sub": owner.id}),
        token_type="bearer",
        tenant_id=tenant.id,
        tenant_name=tenant.name,
    )


@router.post("/login", response_model=Token)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def tenant_login(
    request: Request,
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
# Public: email verification & password reset (Phase 1H)
# ---------------------------------------------------------------------------
@router.post("/verify-email", response_model=SimpleMessage)
async def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Confirm a user's email address via a signed verification token."""
    data = verify_token(
        PURPOSE_VERIFY_EMAIL,
        payload.token,
        max_age_seconds=settings.VERIFY_TOKEN_EXPIRE_HOURS * 3600,
    )
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link is invalid or has expired.",
        )
    user = db.query(UserModel).filter(UserModel.id == data.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if not user.email_verified:
        user.email_verified = True
        db.commit()
    return SimpleMessage(detail="Your email has been verified. You can now sign in.")


@router.post("/resend-verification", response_model=SimpleMessage)
@limiter.limit(settings.RATE_LIMIT_PASSWORD_RESET)
async def resend_verification(
    payload: ResendVerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Resend the verification email. Always returns a generic response."""
    user = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if user and not user.email_verified:
        email_service.send_verification_email(db, user)
    return SimpleMessage(
        detail="If that account exists and is unverified, a verification email has been sent."
    )


@router.post("/password-reset/request", response_model=SimpleMessage)
@limiter.limit(settings.RATE_LIMIT_PASSWORD_RESET)
async def password_reset_request(
    payload: PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Begin a password reset. Always returns a generic success message so the
    endpoint can't be used to enumerate registered emails.
    """
    user = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if user:
        token = generate_token(
            PURPOSE_PASSWORD_RESET, {"user_id": user.id, "email": user.email}
        )
        email_service.send_password_reset_email(db, user.email, token)
    return SimpleMessage(
        detail="If an account exists for that email, a password reset link has been sent."
    )


@router.post("/password-reset/confirm", response_model=SimpleMessage)
@limiter.limit(settings.RATE_LIMIT_PASSWORD_RESET)
async def password_reset_confirm(
    payload: PasswordResetConfirm,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Complete a password reset (or accept an invite) using a signed token.
    Accepts both password-reset and invite tokens so invited users can set their
    initial password through the same page.
    """
    data = verify_token(
        PURPOSE_PASSWORD_RESET,
        payload.token,
        max_age_seconds=settings.RESET_TOKEN_EXPIRE_HOURS * 3600,
    )
    if not data:
        # Fall back to an invite token (longer-lived).
        data = verify_token(
            PURPOSE_INVITE,
            payload.token,
            max_age_seconds=settings.INVITE_TOKEN_EXPIRE_HOURS * 3600,
        )
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired.",
        )
    validate_password_strength(payload.new_password)
    user = db.query(UserModel).filter(UserModel.id == data.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user.hashed_password = get_password_hash(payload.new_password)
    # Setting a password via an emailed link also confirms control of the inbox.
    user.email_verified = True
    db.commit()
    audit_service.record(
        db,
        action="user.password_reset",
        actor_user=user,
        target_type="user",
        target_id=user.id,
        request=request,
    )
    return SimpleMessage(detail="Your password has been updated. You can now sign in.")


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
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_admin),
):
    tenant = _tenant_of(db, current_user)
    result = billing_service.cancel_subscription(db, tenant, subscription_id)
    audit_service.record(
        db,
        action="subscription.cancel",
        actor_user=current_user,
        target_type="subscription",
        target_id=subscription_id,
        meta={"tenant_id": tenant.id},
        request=request,
    )
    return result


@router.post(
    "/billing/subscriptions/{subscription_id}/reactivate",
    response_model=MessageResponse,
)
async def billing_reactivate_subscription(
    subscription_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_admin),
):
    tenant = _tenant_of(db, current_user)
    result = billing_service.reactivate_subscription(db, tenant, subscription_id)
    audit_service.record(
        db,
        action="subscription.reactivate",
        actor_user=current_user,
        target_type="subscription",
        target_id=subscription_id,
        meta={"tenant_id": tenant.id},
        request=request,
    )
    return result


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
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_tenant_admin),
):
    """
    Add a team member.

    Two modes (Phase 1H):
      * If a password is supplied, it is validated and set directly.
      * If no password is supplied, the user is created with an unusable random
        password and an invite email is sent so they set their own password via
        the invite link (mirrors password reset). The link is logged when SMTP
        is unconfigured so the flow stays testable locally.
    """
    tenant = _tenant_of(db, current_user)

    invited = False
    if payload.password:
        validate_password_strength(payload.password)
        password = payload.password
    else:
        invited = True
        # Unusable placeholder; the user sets a real one via the invite link.
        password = secrets.token_urlsafe(24) + "A1"

    user = tenant_portal_service.create_user(
        db,
        tenant,
        email=payload.email,
        password=password,
        full_name=payload.full_name,
        role=payload.role,
    )

    invite_link = None
    if invited:
        token = generate_token(PURPOSE_INVITE, {"user_id": user.id, "email": user.email})
        result = email_service.send_invite_email(db, tenant, user, token)
        # Surface the link to the admin only when email delivery is unconfigured.
        if not result.get("sent"):
            invite_link = f"{settings.FRONTEND_URL.rstrip('/')}/app/reset-password?token={token}"

    audit_service.record(
        db,
        action="tenant.user.invite" if invited else "tenant.user.create",
        actor_user=current_user,
        target_type="user",
        target_id=user.id,
        meta={"email": user.email, "role": user.role, "invited": invited},
        request=request,
    )

    return TenantUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        is_owner=(user.id == tenant.owner_id),
        created_at=user.created_at,
        invited=invited,
        invite_link=invite_link,
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
