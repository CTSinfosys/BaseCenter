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
    is_free_eligible = Column(Boolean, default=True)  # Can be chosen as the free-forever module
    display_order = Column(Integer, default=0)
    # Stripe linkage (populated when SA syncs products to Stripe)
    stripe_product_id = Column(String, nullable=True)
    stripe_price_id = Column(String, nullable=True)
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="module")
