"""
Super Admin (SA) endpoints.
Includes Stripe settings management (enter API keys), connection testing,
and syncing modules to Stripe products/prices.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.api.deps import get_current_superuser
from app.core.config import settings as app_settings
from app.core.rate_limit import limiter
from app.schemas.user import User
from app.schemas.settings import (
    StripeConfig,
    StripeConfigUpdate,
    StripeTestResult,
    SidebarLabelsConfig,
    SidebarLabelsUpdate,
)
from app.schemas.email_settings import (
    EmailConfig,
    EmailConfigUpdate,
    EmailTestRequest,
    EmailTestResult,
)
from app.schemas.audit import AuditLogList
from app.schemas.module import Module as ModuleSchema
from app.schemas.tenant import (
    TenantCreate,
    TenantUpdate,
    TenantSummary,
    TenantDetail,
    SeatUpdate,
    ModuleToggle,
    MessageResponse,
    AnalyticsOverview,
)
from app.services import (
    settings_service,
    stripe_service,
    tenant_service,
    analytics_service,
    email_service,
    audit_service,
    theme_service,
)
from app.services.theme_service import ThemeError
from app.schemas.theme import (
    ThemeOut,
    ThemeCreate,
    ThemeUpdate,
    ThemeDuplicate,
)
from app.models.module import Module

router = APIRouter()


# ---------------------------------------------------------------------------
# Stripe settings
# ---------------------------------------------------------------------------
@router.get("/settings/stripe", response_model=StripeConfig)
async def get_stripe_settings(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """Get current Stripe configuration (secrets masked)."""
    return settings_service.get_stripe_config(db)


@router.put("/settings/stripe", response_model=StripeConfig)
async def update_stripe_settings(
    payload: StripeConfigUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """
    Update Stripe configuration. Blank/omitted fields are left unchanged,
    so masked values shown in the UI can be safely re-submitted without wiping keys.
    """
    result = settings_service.update_stripe_config(
        db,
        publishable_key=payload.stripe_publishable_key,
        secret_key=payload.stripe_secret_key,
        webhook_secret=payload.stripe_webhook_secret,
        mode=payload.stripe_mode,
    )
    audit_service.record(
        db,
        action="settings.stripe.update",
        actor_user=current_user,
        target_type="settings",
        target_id="stripe",
        meta={"mode": result.get("stripe_mode")},
        request=request,
    )
    return result


@router.post("/settings/stripe/test", response_model=StripeTestResult)
async def test_stripe_connection(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """Test the stored Stripe secret key by calling the Stripe API."""
    result = stripe_service.test_connection(db)
    return result


# ---------------------------------------------------------------------------
# Email / SMTP settings (Phase 1H)
# ---------------------------------------------------------------------------
@router.get("/settings/email", response_model=EmailConfig)
async def get_email_settings(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """Get current email/SMTP configuration (password masked)."""
    return settings_service.get_email_config(db)


@router.put("/settings/email", response_model=EmailConfig)
async def update_email_settings(
    payload: EmailConfigUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """
    Update email/SMTP configuration. Blank/omitted fields are left unchanged,
    so the masked password can be re-submitted without wiping it.
    """
    result = settings_service.update_email_config(
        db,
        from_name=payload.from_name,
        from_address=payload.from_address,
        smtp_host=payload.smtp_host,
        smtp_port=payload.smtp_port,
        smtp_user=payload.smtp_user,
        smtp_password=payload.smtp_password,
        smtp_use_tls=payload.smtp_use_tls,
    )
    audit_service.record(
        db,
        action="settings.email.update",
        actor_user=current_user,
        target_type="settings",
        target_id="email",
        meta={"is_configured": result.get("is_configured")},
        request=request,
    )
    return result


@router.post("/settings/email/test", response_model=EmailTestResult)
@limiter.limit(app_settings.RATE_LIMIT_TEST_EMAIL)
async def send_test_email(
    request: Request,
    payload: EmailTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Send a test email to the given address (logs the message if SMTP unconfigured)."""
    result = email_service.send_test_email(db, str(payload.to))
    audit_service.record(
        db,
        action="settings.email.test",
        actor_user=current_user,
        target_type="email",
        target_id=str(payload.to),
        meta={"sent": result.get("sent"), "logged": result.get("logged")},
        request=request,
    )
    return result


# ---------------------------------------------------------------------------
# Sidebar navigation labels
# ---------------------------------------------------------------------------
@router.get("/settings/sidebar", response_model=SidebarLabelsConfig)
async def get_sidebar_labels(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """Get effective sidebar labels (defaults merged with overrides) for all access levels."""
    return settings_service.get_sidebar_labels(db)


@router.put("/settings/sidebar", response_model=SidebarLabelsConfig)
async def update_sidebar_labels(
    payload: SidebarLabelsUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """
    Save sidebar label overrides. Blank/missing labels fall back to defaults,
    so clearing a field resets that item to its default label.
    """
    result = settings_service.set_sidebar_labels(
        db,
        {"admin": payload.admin or {}, "tenant": payload.tenant or {}},
    )
    audit_service.record(
        db,
        action="settings.sidebar.update",
        actor_user=current_user,
        target_type="settings",
        target_id="sidebar",
        request=request,
    )
    return result


@router.get("/sidebar-labels", response_model=SidebarLabelsConfig)
async def public_sidebar_labels(db: Session = Depends(get_db)):
    """
    PUBLIC, lightweight endpoint returning only the effective sidebar labels
    (no secrets). Each shell reads its own access level's labels from here so
    navigation renders overridden labels without requiring SA auth.
    """
    return settings_service.get_sidebar_labels(db)


# ---------------------------------------------------------------------------
# Theming (Phase 2A) — SA-managed themes for website / splash / app scopes
# ---------------------------------------------------------------------------
@router.get("/themes", response_model=List[ThemeOut])
async def list_themes_admin(
    scope: str = Query(..., description="website | splash | app"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    try:
        return theme_service.list_themes(db, scope)
    except ThemeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/themes", response_model=ThemeOut, status_code=status.HTTP_201_CREATED)
async def create_theme_admin(
    payload: ThemeCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    try:
        theme = theme_service.create_theme(
            db,
            scope=payload.scope,
            name=payload.name,
            tokens=payload.tokens,
            is_default=payload.is_default,
        )
    except ThemeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    audit_service.record(
        db,
        action="theme.create",
        actor_user=current_user,
        target_type="theme",
        target_id=str(theme.id),
        meta={"scope": theme.scope, "name": theme.name},
        request=request,
    )
    return theme


@router.get("/themes/{theme_id}", response_model=ThemeOut)
async def get_theme_admin(
    theme_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    theme = theme_service.get_theme(db, theme_id)
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Theme not found")
    return theme


@router.put("/themes/{theme_id}", response_model=ThemeOut)
async def update_theme_admin(
    theme_id: int,
    payload: ThemeUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    theme = theme_service.get_theme(db, theme_id)
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Theme not found")
    try:
        theme = theme_service.update_theme(
            db, theme, name=payload.name, tokens=payload.tokens
        )
    except ThemeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    audit_service.record(
        db,
        action="theme.update",
        actor_user=current_user,
        target_type="theme",
        target_id=str(theme.id),
        meta={"scope": theme.scope, "name": theme.name},
        request=request,
    )
    return theme


@router.delete("/themes/{theme_id}", response_model=MessageResponse)
async def delete_theme_admin(
    theme_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    theme = theme_service.get_theme(db, theme_id)
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Theme not found")
    scope, name = theme.scope, theme.name
    try:
        theme_service.delete_theme(db, theme)
    except ThemeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    audit_service.record(
        db,
        action="theme.delete",
        actor_user=current_user,
        target_type="theme",
        target_id=str(theme_id),
        meta={"scope": scope, "name": name},
        request=request,
    )
    return MessageResponse(success=True, message="Theme deleted")


@router.post("/themes/{theme_id}/duplicate", response_model=ThemeOut, status_code=status.HTTP_201_CREATED)
async def duplicate_theme_admin(
    theme_id: int,
    payload: ThemeDuplicate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    theme = theme_service.get_theme(db, theme_id)
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Theme not found")
    copy = theme_service.duplicate_theme(db, theme, new_name=payload.name)
    audit_service.record(
        db,
        action="theme.duplicate",
        actor_user=current_user,
        target_type="theme",
        target_id=str(copy.id),
        meta={"scope": copy.scope, "name": copy.name, "source_id": theme_id},
        request=request,
    )
    return copy


@router.post("/themes/{theme_id}/set-default", response_model=ThemeOut)
async def set_default_theme_admin(
    theme_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    theme = theme_service.get_theme(db, theme_id)
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Theme not found")
    theme = theme_service.set_default(db, theme)
    audit_service.record(
        db,
        action="theme.set_default",
        actor_user=current_user,
        target_type="theme",
        target_id=str(theme.id),
        meta={"scope": theme.scope, "name": theme.name},
        request=request,
    )
    return theme


# ---------------------------------------------------------------------------
# Module management / Stripe sync
# ---------------------------------------------------------------------------
@router.get("/modules", response_model=List[ModuleSchema])
async def list_modules_admin(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """List all modules (admin view, includes Stripe linkage)."""
    return db.query(Module).order_by(Module.display_order).all()


@router.post("/modules/sync-stripe")
async def sync_modules_to_stripe(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """
    Create Stripe Product + Price for any paid module missing them.
    Requires Stripe secret key to be configured.
    """
    try:
        modules = db.query(Module).filter(Module.monthly_price > 0).all()
        synced = []
        for module in modules:
            if module.stripe_price_id:
                continue  # already synced
            ids = stripe_service.ensure_stripe_product_and_price(db, module)
            module.stripe_product_id = ids["product_id"]
            module.stripe_price_id = ids["price_id"]
            db.commit()
            synced.append({"module": module.name, "price_id": ids["price_id"]})
        return {"success": True, "synced_count": len(synced), "synced": synced}
    except stripe_service.StripeNotConfiguredError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Stripe error: {str(e)}")


# ---------------------------------------------------------------------------
# Tenant management
# ---------------------------------------------------------------------------
@router.get("/tenants", response_model=List[TenantSummary])
async def list_tenants(
    search: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """List all tenants with optional search (name/subdomain) and status filter."""
    return tenant_service.list_tenants(db, search=search, status=status)


@router.post("/tenants", response_model=TenantDetail, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    payload: TenantCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Create a tenant (optionally with an owner user)."""
    tenant = tenant_service.create_tenant(
        db,
        name=payload.name,
        subdomain=payload.subdomain,
        seats_allocated=payload.seats_allocated,
        owner_email=payload.owner_email,
        owner_full_name=payload.owner_full_name,
        owner_password=payload.owner_password,
    )
    audit_service.record(
        db,
        action="tenant.create",
        actor_user=current_user,
        target_type="tenant",
        target_id=tenant.id,
        meta={"name": payload.name, "subdomain": payload.subdomain},
        request=request,
    )
    return tenant_service.get_tenant_detail(db, tenant.id)


@router.get("/tenants/{tenant_id}", response_model=TenantDetail)
async def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    detail = tenant_service.get_tenant_detail(db, tenant_id)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return detail


@router.put("/tenants/{tenant_id}", response_model=TenantDetail)
async def update_tenant(
    tenant_id: int,
    payload: TenantUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    tenant = tenant_service.update_tenant(
        db,
        tenant_id,
        name=payload.name,
        subdomain=payload.subdomain,
        seats_allocated=payload.seats_allocated,
        owner_id=payload.owner_id,
    )
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant_service.get_tenant_detail(db, tenant_id)


@router.post("/tenants/{tenant_id}/suspend", response_model=TenantDetail)
async def suspend_tenant(
    tenant_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    tenant = tenant_service.set_status(db, tenant_id, active=False)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    audit_service.record(
        db,
        action="tenant.suspend",
        actor_user=current_user,
        target_type="tenant",
        target_id=tenant_id,
        request=request,
    )
    return tenant_service.get_tenant_detail(db, tenant_id)


@router.post("/tenants/{tenant_id}/reactivate", response_model=TenantDetail)
async def reactivate_tenant(
    tenant_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    tenant = tenant_service.set_status(db, tenant_id, active=True)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    audit_service.record(
        db,
        action="tenant.reactivate",
        actor_user=current_user,
        target_type="tenant",
        target_id=tenant_id,
        request=request,
    )
    return tenant_service.get_tenant_detail(db, tenant_id)


@router.put("/tenants/{tenant_id}/seats", response_model=TenantDetail)
async def update_tenant_seats(
    tenant_id: int,
    payload: SeatUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    tenant = tenant_service.set_seats(db, tenant_id, payload.seats_allocated)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    audit_service.record(
        db,
        action="tenant.seats.update",
        actor_user=current_user,
        target_type="tenant",
        target_id=tenant_id,
        meta={"seats_allocated": payload.seats_allocated},
        request=request,
    )
    return tenant_service.get_tenant_detail(db, tenant_id)


@router.post("/tenants/{tenant_id}/modules/{module_id}/enable", response_model=TenantDetail)
async def enable_tenant_module(
    tenant_id: int,
    module_id: int,
    request: Request,
    payload: ModuleToggle | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    seats = payload.seats if payload and payload.seats else 1
    try:
        tenant_service.enable_module(db, tenant_id, module_id, seats=seats)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    audit_service.record(
        db,
        action="tenant.module.enable",
        actor_user=current_user,
        target_type="tenant",
        target_id=tenant_id,
        meta={"module_id": module_id, "seats": seats},
        request=request,
    )
    return tenant_service.get_tenant_detail(db, tenant_id)


@router.post("/tenants/{tenant_id}/modules/{module_id}/disable", response_model=TenantDetail)
async def disable_tenant_module(
    tenant_id: int,
    module_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    result = tenant_service.disable_module(db, tenant_id, module_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No subscription found for that module",
        )
    audit_service.record(
        db,
        action="tenant.module.disable",
        actor_user=current_user,
        target_type="tenant",
        target_id=tenant_id,
        meta={"module_id": module_id},
        request=request,
    )
    return tenant_service.get_tenant_detail(db, tenant_id)


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------
@router.get("/analytics/overview", response_model=AnalyticsOverview)
async def analytics_overview(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """Platform-wide metrics for the SA dashboard."""
    return analytics_service.overview(db)


# ---------------------------------------------------------------------------
# Audit log (Phase 1H)
# ---------------------------------------------------------------------------
@router.get("/audit", response_model=AuditLogList)
async def list_audit_logs(
    actor: Optional[str] = Query(None, description="Filter by actor email (substring)"),
    action: Optional[str] = Query(None, description="Filter by action (substring)"),
    date_from: Optional[str] = Query(None, description="ISO date (inclusive)"),
    date_to: Optional[str] = Query(None, description="ISO date (inclusive)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """Paginated, filterable audit log for Super Admins."""
    items, total = audit_service.list_logs(
        db,
        actor=actor,
        action=action,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}
