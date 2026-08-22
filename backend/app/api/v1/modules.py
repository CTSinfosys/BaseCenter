"""
Public module catalog endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.schemas.module import Module as ModuleSchema
from app.models.module import Module

router = APIRouter()


@router.get("", response_model=List[ModuleSchema])
async def list_modules(db: Session = Depends(get_db)):
    """List all active modules (public catalog)."""
    return (
        db.query(Module)
        .filter(Module.is_active == True)  # noqa: E712
        .order_by(Module.display_order)
        .all()
    )
