"""
Subscription database model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    is_free_module = Column(Boolean, default=False)  # Track if this is the free forever module
    stripe_subscription_id = Column(String, unique=True, nullable=True)
    status = Column(String, default="active")  # active, cancelled, past_due, etc.
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="subscriptions")
    module = relationship("Module", back_populates="subscriptions")
