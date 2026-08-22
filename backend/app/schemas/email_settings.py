"""Email/SMTP settings schemas (Phase 1H)."""
from typing import Optional
from pydantic import BaseModel, EmailStr


class EmailConfig(BaseModel):
    from_name: Optional[str] = None
    from_address: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[str] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None  # masked in responses
    smtp_use_tls: Optional[str] = "true"
    is_configured: bool = False


class EmailConfigUpdate(BaseModel):
    from_name: Optional[str] = None
    from_address: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[str] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None  # write-only; empty leaves unchanged
    smtp_use_tls: Optional[str] = None


class EmailTestRequest(BaseModel):
    to: EmailStr


class EmailTestResult(BaseModel):
    sent: bool
    logged: bool
    detail: str
