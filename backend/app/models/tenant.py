"""
Tenant database model
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    subdomain = Column(String, unique=True, index=True, nullable=True)
    stripe_customer_id = Column(String, unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    # Lifecycle status: active | suspended  (kept in sync with is_active)
    status = Column(String, default="active", nullable=False)
    # Number of seats (users) allocated to this tenant
    seats_allocated = Column(Integer, default=5, nullable=False)
    # Owner (primary account holder) — one of the tenant's users
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    users = relationship(
        "User", back_populates="tenant", foreign_keys="User.tenant_id"
    )
    owner = relationship("User", foreign_keys=[owner_id], post_update=True)
    subscriptions = relationship("Subscription", back_populates="tenant")
