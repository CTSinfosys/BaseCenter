"""
Public content endpoint (Phase 2B — lightweight CMS).

Each managed public page (``website`` = ``/``, ``splash`` = ``/modules``)
fetches its VISIBLE, ordered sections from here — no authentication required —
and renders them. Mirrors the public theme endpoint pattern.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.content import PublicSection
from app.services import content_service
from app.services.content_service import ContentError

router = APIRouter()


@router.get("/{page}", response_model=List[PublicSection])
async def get_public_content(
    page: str,
    db: Session = Depends(get_db),
):
    """Return visible, ordered sections for a managed page ('website' | 'splash')."""
    try:
        return content_service.list_visible(db, page)
    except ContentError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
