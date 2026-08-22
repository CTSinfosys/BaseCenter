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

    # Signed-token expiry (Phase 1H — email verification / password reset / invites)
    VERIFY_TOKEN_EXPIRE_HOURS: int = int(os.getenv("VERIFY_TOKEN_EXPIRE_HOURS", "48"))
    RESET_TOKEN_EXPIRE_HOURS: int = int(os.getenv("RESET_TOKEN_EXPIRE_HOURS", "2"))
    INVITE_TOKEN_EXPIRE_HOURS: int = int(os.getenv("INVITE_TOKEN_EXPIRE_HOURS", "168"))

    # Rate limiting (Phase 1H) — configurable, generous defaults so normal use is not blocked
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() in ("1", "true", "yes")
    RATE_LIMIT_LOGIN: str = os.getenv("RATE_LIMIT_LOGIN", "10/minute")
    RATE_LIMIT_SIGNUP: str = os.getenv("RATE_LIMIT_SIGNUP", "5/minute")
    RATE_LIMIT_PASSWORD_RESET: str = os.getenv("RATE_LIMIT_PASSWORD_RESET", "5/minute")
    RATE_LIMIT_TEST_EMAIL: str = os.getenv("RATE_LIMIT_TEST_EMAIL", "5/minute")

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
