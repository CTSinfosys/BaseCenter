"""
Platform settings database model
Stores key-value configuration such as Stripe API keys.
Sensitive values are encrypted at rest.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.database import Base


class PlatformSetting(Base):
    __tablename__ = "platform_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)          # Encrypted if is_secret=True
    is_secret = Column(Boolean, default=False)   # Whether value is encrypted
    description = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
