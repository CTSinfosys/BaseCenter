"""
BaseCenter.ai Backend API
FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
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

# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="BaseCenter.ai - Modular Business Platform API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
