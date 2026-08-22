"""
Public (no-auth) rendering endpoints (Phase 1F), prefix /api/v1/public.

Serves read-only content for PUBLISHED websites only. Unpublished sites return
404 and are never publicly viewable.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.website import PublicWebsite
from app.services import website_service

router = APIRouter()


@router.get("/sites/{slug}", response_model=PublicWebsite)
async def public_site(slug: str, db: Session = Depends(get_db)):
    return website_service.get_public_website(db, slug)
