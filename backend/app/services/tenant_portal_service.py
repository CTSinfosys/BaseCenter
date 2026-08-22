"""
Tenant self-service portal service (customer-facing).

Business logic for tenant signup/onboarding, dashboard aggregation, module
activation (free direct / paid via Stripe checkout), and tenant user & seat
management with seat-limit enforcement.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.tenant import Tenant
from app.models.user import User
from app.models.module import Module
from app.models.subscription import Subscription
from app.core.security import get_password_hash
from app.services import stripe_service, settings_service


# Free tier includes 10 seats (per build doc: "1 Free + Free Website" model).
DEFAULT_SEATS = 10


# ---------------------------------------------------------------------------
# Signup / onboarding
# ---------------------------------------------------------------------------
def signup_tenant(
    db: Session,
    company_name: str,
    email: str,
    password: str,
    full_name: Optional[str] = None,
) -> tuple[Tenant, User]:
    """Create a new Tenant plus its owner User (role=tenant_admin)."""
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    # Create the tenant first (owner_id set after the user exists).
    tenant = Tenant(
        name=company_name,
        is_active=True,
        status="active",
        seats_allocated=DEFAULT_SEATS,
    )
    db.add(tenant)
    db.flush()  # assign tenant.id without committing

    owner = User(
        email=email,
        hashed_password=get_password_hash(password),
        full_name=full_name,
        is_active=True,
        is_superuser=False,
        role="tenant_admin",
        tenant_id=tenant.id,
    )
    db.add(owner)
    db.flush()

    tenant.owner_id = owner.id

    # Onboarding default: activate any free-eligible module directly (e.g. Website Builder).
    _activate_default_free_modules(db, tenant)

    db.commit()
    db.refresh(tenant)
    db.refresh(owner)
    return tenant, owner


def _activate_default_free_modules(db: Session, tenant: Tenant) -> None:
    """Activate the always-free Website module ($0) for every new tenant.

    The tenant still gets to pick their 1 free CORE business module later from
    the catalog (first free-eligible activation is free; the rest are paid).
    """
    website = (
        db.query(Module)
        .filter(Module.is_active == True, Module.monthly_price == 0)  # noqa: E712
        .order_by(Module.display_order)
        .first()
    )
    if not website:
        return
    exists = (
        db.query(Subscription)
        .filter(
            Subscription.tenant_id == tenant.id,
            Subscription.module_id == website.id,
        )
        .first()
    )
    if exists:
        return
    db.add(
        Subscription(
            tenant_id=tenant.id,
            module_id=website.id,
            is_free_module=True,
            status="active",
            seats=DEFAULT_SEATS,
        )
    )


def _has_free_core_module(db: Session, tenant: Tenant) -> bool:
    """True if the tenant has already used their single free CORE ($5) module slot."""
    return (
        db.query(Subscription)
        .join(Module, Module.id == Subscription.module_id)
        .filter(
            Subscription.tenant_id == tenant.id,
            Subscription.status == "active",
            Subscription.is_free_module == True,  # noqa: E712
            Module.monthly_price > 0,
        )
        .count()
        > 0
    )


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
def _seat_usage(db: Session, tenant: Tenant) -> dict:
    used = (
        db.query(User)
        .filter(User.tenant_id == tenant.id, User.is_active == True)  # noqa: E712
        .count()
    )
    allocated = tenant.seats_allocated or 0
    return {
        "allocated": allocated,
        "used": used,
        "available": max(allocated - used, 0),
    }


def get_dashboard(db: Session, tenant: Tenant) -> dict:
    subs = (
        db.query(Subscription)
        .filter(
            Subscription.tenant_id == tenant.id,
            Subscription.status == "active",
        )
        .all()
    )
    stripe_configured = bool(
        settings_service.get_setting(db, settings_service.STRIPE_SECRET_KEY)
    )

    active_modules = []
    monthly_total = 0
    paid_count = 0
    for sub in subs:
        module = db.query(Module).filter(Module.id == sub.module_id).first()
        if not module:
            continue
        price = 0 if sub.is_free_module else module.monthly_price
        if not sub.is_free_module:
            paid_count += 1
            monthly_total += module.monthly_price
        active_modules.append(
            {
                "subscription_id": sub.id,
                "module_id": module.id,
                "name": module.name,
                "slug": module.slug,
                "icon": module.icon,
                "is_free_module": sub.is_free_module,
                "status": sub.status,
                "monthly_price": price,
            }
        )

    return {
        "tenant_id": tenant.id,
        "tenant_name": tenant.name,
        "status": tenant.status,
        "seats": _seat_usage(db, tenant),
        "billing": {
            "stripe_configured": stripe_configured,
            "stripe_customer_id": tenant.stripe_customer_id,
            "active_paid_modules": paid_count,
            "monthly_total_cents": monthly_total,
        },
        "active_modules": active_modules,
    }


# ---------------------------------------------------------------------------
# Module catalog & activation
# ---------------------------------------------------------------------------
def get_catalog(db: Session, tenant: Tenant) -> List[dict]:
    modules = (
        db.query(Module)
        .filter(Module.is_active == True)  # noqa: E712
        .order_by(Module.display_order)
        .all()
    )
    subs = {
        s.module_id: s
        for s in db.query(Subscription)
        .filter(Subscription.tenant_id == tenant.id)
        .all()
    }
    catalog = []
    for m in modules:
        sub = subs.get(m.id)
        is_activated = bool(sub and sub.status == "active")
        catalog.append(
            {
                "id": m.id,
                "name": m.name,
                "slug": m.slug,
                "description": m.description,
                "icon": m.icon,
                "monthly_price": m.monthly_price,
                "is_free_eligible": m.is_free_eligible,
                "is_activated": is_activated,
                "subscription_status": sub.status if sub else None,
                "subscription_id": sub.id if sub else None,
                "stripe_ready": bool(m.stripe_price_id),
            }
        )
    return catalog


def activate_module(db: Session, tenant: Tenant, module_id: int) -> dict:
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module or not module.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Module not found."
        )

    existing = (
        db.query(Subscription)
        .filter(
            Subscription.tenant_id == tenant.id,
            Subscription.module_id == module.id,
        )
        .first()
    )
    if existing and existing.status == "active":
        return {
            "activated": True,
            "requires_checkout": False,
            "checkout_url": None,
            "message": f"{module.name} is already active.",
        }

    # Always-free module (e.g. Website Builder, $0) activates directly for everyone.
    if module.monthly_price == 0:
        return _activate_free(db, tenant, module, existing, is_free=True)

    # "1 Free Core Module" model: if the tenant hasn't used their single free
    # core-module slot yet and this module is free-eligible, activate it free.
    if module.is_free_eligible and not _has_free_core_module(db, tenant):
        return _activate_free(db, tenant, module, existing, is_free=True)

    # Otherwise it's a paid module → Stripe checkout.
    if not module.stripe_price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This paid module is not yet synced to Stripe. "
            "Ask the platform admin to sync modules before activating.",
        )
    try:
        url = stripe_service.create_checkout_session(
            db,
            tenant,
            module.stripe_price_id,
            module.id,
            quantity=1,
            success_path="/app/modules",
            cancel_path="/app/modules",
        )
    except stripe_service.StripeNotConfiguredError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Online payments are not available yet. Stripe has not been "
            "configured by the platform administrator. Please try again later.",
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Payment provider error: {str(e)}",
        )
    return {
        "activated": False,
        "requires_checkout": True,
        "checkout_url": url,
        "message": "Redirecting to secure checkout to complete activation.",
    }


def _activate_free(
    db: Session, tenant: Tenant, module: Module, existing, is_free: bool = True
) -> dict:
    if existing:
        existing.status = "active"
        existing.is_free_module = is_free
        existing.seats = DEFAULT_SEATS
    else:
        db.add(
            Subscription(
                tenant_id=tenant.id,
                module_id=module.id,
                is_free_module=is_free,
                status="active",
                seats=DEFAULT_SEATS,
            )
        )
    db.commit()
    return {
        "activated": True,
        "requires_checkout": False,
        "checkout_url": None,
        "message": f"{module.name} activated free of charge.",
    }


def deactivate_module(db: Session, tenant: Tenant, subscription_id: int) -> dict:
    sub = (
        db.query(Subscription)
        .filter(
            Subscription.id == subscription_id,
            Subscription.tenant_id == tenant.id,
        )
        .first()
    )
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found."
        )
    if sub.stripe_subscription_id:
        try:
            stripe_service.cancel_subscription(db, sub.stripe_subscription_id)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Payment provider error: {str(e)}",
            )
    sub.status = "cancelled"
    db.commit()
    return {"success": True, "message": "Module deactivated."}


# ---------------------------------------------------------------------------
# Tenant user & seat management
# ---------------------------------------------------------------------------
def list_users(db: Session, tenant: Tenant) -> dict:
    users = (
        db.query(User)
        .filter(User.tenant_id == tenant.id)
        .order_by(User.created_at)
        .all()
    )
    result = []
    for u in users:
        result.append(
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "is_active": u.is_active,
                "is_owner": u.id == tenant.owner_id,
                "created_at": u.created_at,
            }
        )
    return {"users": result, "seats": _seat_usage(db, tenant)}


def create_user(
    db: Session,
    tenant: Tenant,
    email: str,
    password: str,
    full_name: Optional[str] = None,
    role: str = "member",
) -> User:
    # Enforce seat limit against active users.
    usage = _seat_usage(db, tenant)
    if usage["available"] <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Seat limit reached ({usage['used']}/{usage['allocated']}). "
            "Deactivate a user or upgrade your plan to add more.",
        )
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )
    if role not in ("member", "tenant_admin"):
        role = "member"

    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        full_name=full_name,
        is_active=True,
        is_superuser=False,
        role=role,
        tenant_id=tenant.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def set_user_active(
    db: Session, tenant: Tenant, user_id: int, is_active: bool
) -> User:
    user = (
        db.query(User)
        .filter(User.id == user_id, User.tenant_id == tenant.id)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )
    if user.id == tenant.owner_id and not is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The account owner cannot be deactivated.",
        )
    # Re-activating counts against the seat limit.
    if is_active and not user.is_active:
        usage = _seat_usage(db, tenant)
        if usage["available"] <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Seat limit reached ({usage['used']}/{usage['allocated']}).",
            )
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user
