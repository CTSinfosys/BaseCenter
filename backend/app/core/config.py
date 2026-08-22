"""
Core configuration settings for BaseCenter.ai Backend
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Application
    PROJECT_NAME: str = "BaseCenter.ai API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Encryption key for settings stored at rest (Stripe secret keys, etc.)
    SETTINGS_ENCRYPTION_KEY: str = os.getenv(
        "SETTINGS_ENCRYPTION_KEY", "change-this-settings-encryption-key-in-production"
    )

    # Frontend base URL (used for Stripe checkout redirect URLs)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://c0ac1c01a.na111.preview.abacusai.app",
        "https://basecenter.ai",
        "https://www.basecenter.ai"
    ]
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://basecenter:basecenter123@localhost:5432/basecenter_db"
    )
    
    # Postgres
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "basecenter")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "basecenter123")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "basecenter_db")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    
    # Admin
    FIRST_SUPERUSER_EMAIL: str = os.getenv("FIRST_SUPERUSER_EMAIL", "admin@basecenter.ai")
    FIRST_SUPERUSER_PASSWORD: str = os.getenv("FIRST_SUPERUSER_PASSWORD", "changeme123")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
