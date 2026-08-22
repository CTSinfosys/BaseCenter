"""
BaseCenter.ai Backend API
FastAPI application entry point
"""
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.config import settings
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.api.v1 import (
    auth,
    users,
    admin,
    modules,
    subscriptions,
    webhooks,
    tenant,
    website_builder,
    public,
)

# Ensure our own loggers (email links, audit) surface at INFO alongside uvicorn.
# When SMTP is unconfigured, verification/reset/invite links are logged here so
# the flows remain testable locally.
_bc_logger = logging.getLogger("basecenter")
if not _bc_logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(levelname)s:%(name)s:%(message)s"))
    _bc_logger.addHandler(_handler)
_bc_logger.setLevel(logging.INFO)
_bc_logger.propagate = False

# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="BaseCenter.ai - Modular Business Platform API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Rate limiting (Phase 1H) — register limiter, middleware and 429 handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Configure CORS (explicit allowlist)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security headers (Phase 1H).
# NOTE: We deliberately do NOT send X-Frame-Options and instead use a
# frame-ancestors CSP that still permits embedding inside the Abacus preview
# iframe (https://*.abacus.ai). Do not add X-Frame-Options: DENY here — it would
# re-break the preview embed.
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = (
        "frame-ancestors 'self' https://*.abacus.ai https://*.abacusai.app"
    )
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

# Include API routers
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["authentication"])
app.include_router(users.router, prefix=f"{settings.API_V1_PREFIX}/users", tags=["users"])
app.include_router(admin.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["super-admin"])
app.include_router(modules.router, prefix=f"{settings.API_V1_PREFIX}/modules", tags=["modules"])
app.include_router(subscriptions.router, prefix=f"{settings.API_V1_PREFIX}/subscriptions", tags=["subscriptions"])
app.include_router(webhooks.router, prefix=f"{settings.API_V1_PREFIX}/webhooks", tags=["webhooks"])
app.include_router(tenant.router, prefix=f"{settings.API_V1_PREFIX}/tenant", tags=["tenant-portal"])
app.include_router(website_builder.router, prefix=f"{settings.API_V1_PREFIX}/tenant/website-builder", tags=["module-website-builder"])
app.include_router(public.router, prefix=f"{settings.API_V1_PREFIX}/public", tags=["public"])

@app.get("/")
async def root():
    """Root endpoint - API health check"""
    return {
        "message": "BaseCenter.ai API",
        "version": settings.VERSION,
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
