"""
Processed Stripe webhook events (Phase 1G).

Records the Stripe event id of every webhook we have processed so that redelivered
events are idempotent — a repeated event id is a no-op.
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from app.db.database import Base


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    # Stripe event id (evt_...), unique so processing is idempotent.
    event_id = Column(String, unique=True, nullable=False, index=True)
    event_type = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
