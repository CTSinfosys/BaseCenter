"""
Module database model
"""
from sqlalchemy import Column, Integer, String, Boolean, Text
from sqlalchemy.orm import relationship
from app.db.database import Base


class Module(Base):
    __tablename__ = "modules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    slug = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True)
    monthly_price = Column(Integer, default=500)  # Price in cents ($5.00)
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="module")
