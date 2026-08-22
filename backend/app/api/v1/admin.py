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
from app.services import settings_service, stripe_service
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
