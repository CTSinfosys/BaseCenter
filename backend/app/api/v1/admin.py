"""
Super Admin (SA) endpoints.
Includes Stripe settings management (enter API keys), connection testing,
and syncing modules to Stripe products/prices.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.api.deps import get_current_superuser
from app.schemas.user import User
from app.schemas.settings import StripeConfig, StripeConfigUpdate, StripeTestResult
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
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """
    Update Stripe configuration. Blank/omitted fields are left unchanged,
    so masked values shown in the UI can be safely re-submitted without wiping keys.
    """
    return settings_service.update_stripe_config(
        db,
        publishable_key=payload.stripe_publishable_key,
        secret_key=payload.stripe_secret_key,
        webhook_secret=payload.stripe_webhook_secret,
        mode=payload.stripe_mode,
    )


@router.post("/settings/stripe/test", response_model=StripeTestResult)
async def test_stripe_connection(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """Test the stored Stripe secret key by calling the Stripe API."""
    result = stripe_service.test_connection(db)
    return result


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
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
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
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    tenant = tenant_service.set_status(db, tenant_id, active=False)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant_service.get_tenant_detail(db, tenant_id)


@router.post("/tenants/{tenant_id}/reactivate", response_model=TenantDetail)
async def reactivate_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    tenant = tenant_service.set_status(db, tenant_id, active=True)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant_service.get_tenant_detail(db, tenant_id)


@router.put("/tenants/{tenant_id}/seats", response_model=TenantDetail)
async def update_tenant_seats(
    tenant_id: int,
    payload: SeatUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    tenant = tenant_service.set_seats(db, tenant_id, payload.seats_allocated)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant_service.get_tenant_detail(db, tenant_id)


@router.post("/tenants/{tenant_id}/modules/{module_id}/enable", response_model=TenantDetail)
async def enable_tenant_module(
    tenant_id: int,
    module_id: int,
    payload: ModuleToggle | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    seats = payload.seats if payload and payload.seats else 1
    try:
        tenant_service.enable_module(db, tenant_id, module_id, seats=seats)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return tenant_service.get_tenant_detail(db, tenant_id)


@router.post("/tenants/{tenant_id}/modules/{module_id}/disable", response_model=TenantDetail)
async def disable_tenant_module(
    tenant_id: int,
    module_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    result = tenant_service.disable_module(db, tenant_id, module_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No subscription found for that module",
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
