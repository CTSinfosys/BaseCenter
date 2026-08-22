"""
User database model
"""
from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    # Tenant-scoped role: 'tenant_admin' (owner / can manage users & modules) or 'member'.
    # Super admins (is_superuser) are platform owners and are not tenant-scoped.
    role = Column(String, default="member", nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    tenant = relationship(
        "Tenant", back_populates="users", foreign_keys=[tenant_id]
    )
