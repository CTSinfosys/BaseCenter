"""
Reusable module-access guard (Phase 1F).

``require_active_module(module_slug)`` returns a FastAPI dependency that:
  1. resolves the authenticated tenant user (via ``get_current_tenant_user``),
  2. loads the owning ``Tenant``,
  3. verifies the tenant has an ACTIVE subscription for the given module slug,
  4. raises HTTP 403 if the module is not active for that tenant,
  5. returns the ``Tenant`` for downstream tenant-scoped queries.

This is the centerpiece of the reusable module pattern: any module router can
depend on ``require_active_module("<slug>")`` to get subscription gating plus a
tenant handle for strict data isolation, with zero per-module boilerplate.
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.v1.tenant import get_current_tenant_user
from app.schemas.user import User as UserSchema
from app.models.tenant import Tenant
from app.models.module import Module
from app.models.subscription import Subscription


def require_active_module(module_slug: str):
    """Build a dependency enforcing an active subscription for ``module_slug``.

    Usage::

        @router.get("/...")
        def endpoint(tenant: Tenant = Depends(require_active_module("website-builder"))):
            ...
    """

    async def _dependency(
        db: Session = Depends(get_db),
        current_user: UserSchema = Depends(get_current_tenant_user),
    ) -> Tenant:
        tenant = (
            db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
        )
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found."
            )

        active = (
            db.query(Subscription)
            .join(Module, Subscription.module_id == Module.id)
            .filter(
                Subscription.tenant_id == tenant.id,
                Subscription.status == "active",
                Module.slug == module_slug,
            )
            .first()
        )
        if not active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Module '{module_slug}' is not active for this tenant.",
            )
        return tenant

    return _dependency
