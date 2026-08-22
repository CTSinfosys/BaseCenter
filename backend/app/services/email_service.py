"""
Email service (Phase 1H).

Provides a small abstraction over outbound transactional email with graceful
degradation (mirrors the Stripe "works when unconfigured" pattern):

  * When SMTP is configured (host + From address present in encrypted platform
    settings), messages are sent via smtplib.
  * When SMTP is NOT configured, nothing is sent — instead the message (and any
    action link it contains) is logged so local/dev flows remain fully testable.

Secrets (SMTP password) are never logged. Action links (verify/reset/invite)
are safe to log and are always logged so they can be copied during local dev.
"""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.tokens import (
    generate_token,
    PURPOSE_VERIFY_EMAIL,
    PURPOSE_PASSWORD_RESET,
    PURPOSE_INVITE,
)
from app.services import settings_service

logger = logging.getLogger("basecenter.email")


def is_configured(db: Session) -> bool:
    return settings_service.is_email_configured(db)


def _frontend(path: str) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}{path}"


def send_email(
    db: Session,
    to: str,
    subject: str,
    text: str,
    html: Optional[str] = None,
) -> dict:
    """
    Send an email if SMTP is configured, otherwise log it. Returns a dict with
    'sent' and 'logged' flags. Never raises for the unconfigured case.
    """
    if not is_configured(db):
        logger.info(
            "[email:unconfigured] Would send email to=%s subject=%r\n%s",
            to, subject, text,
        )
        return {"sent": False, "logged": True, "detail": "SMTP not configured; email logged."}

    cfg = settings_service.get_email_config(db, reveal_secrets=True)
    from_name = cfg.get("from_name") or "BaseCenter.ai"
    from_addr = cfg.get("from_address")
    host = cfg.get("smtp_host")
    port = int(cfg.get("smtp_port") or 587)
    user = cfg.get("smtp_user")
    password = cfg.get("smtp_password")
    use_tls = str(cfg.get("smtp_use_tls") or "true").lower() in ("1", "true", "yes")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_addr}>"
    msg["To"] = to
    msg.attach(MIMEText(text, "plain"))
    if html:
        msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            if use_tls:
                server.starttls()
            if user and password:
                server.login(user, password)
            server.sendmail(from_addr, [to], msg.as_string())
        # Do NOT log recipients-with-body at info in prod noise; keep it minimal.
        logger.info("[email:sent] to=%s subject=%r", to, subject)
        return {"sent": True, "logged": False, "detail": "Email sent."}
    except Exception as exc:  # noqa: BLE001 - surface a clean failure, never leak secrets
        logger.error("[email:error] failed to send to=%s subject=%r error=%s", to, subject, exc)
        return {"sent": False, "logged": False, "detail": f"Failed to send email: {exc}"}


# ---------------------------------------------------------------------------
# High-level transactional emails
# ---------------------------------------------------------------------------
def send_verification_email(db: Session, user) -> dict:
    token = generate_token(PURPOSE_VERIFY_EMAIL, {"user_id": user.id, "email": user.email})
    link = _frontend(f"/app/verify-email?token={token}")
    logger.info("[email:link] verify-email for %s -> %s", user.email, link)
    subject = "Verify your BaseCenter.ai email"
    text = (
        f"Hi {user.full_name or ''},\n\n"
        f"Please verify your email address by visiting the link below:\n\n{link}\n\n"
        f"This link expires in {settings.VERIFY_TOKEN_EXPIRE_HOURS} hours.\n\n"
        "If you did not create this account, you can ignore this message."
    )
    html = (
        f"<p>Hi {user.full_name or ''},</p>"
        f"<p>Please verify your email address:</p>"
        f'<p><a href="{link}">Verify my email</a></p>'
        f"<p>This link expires in {settings.VERIFY_TOKEN_EXPIRE_HOURS} hours.</p>"
    )
    return send_email(db, user.email, subject, text, html)


def send_password_reset_email(db: Session, email: str, token: str) -> dict:
    link = _frontend(f"/app/reset-password?token={token}")
    logger.info("[email:link] password-reset for %s -> %s", email, link)
    subject = "Reset your BaseCenter.ai password"
    text = (
        "We received a request to reset your password.\n\n"
        f"Reset it using the link below:\n\n{link}\n\n"
        f"This link expires in {settings.RESET_TOKEN_EXPIRE_HOURS} hours.\n\n"
        "If you did not request a reset, you can safely ignore this message."
    )
    html = (
        "<p>We received a request to reset your password.</p>"
        f'<p><a href="{link}">Reset my password</a></p>'
        f"<p>This link expires in {settings.RESET_TOKEN_EXPIRE_HOURS} hours.</p>"
    )
    return send_email(db, email, subject, text, html)


def send_invite_email(db: Session, tenant, user, token: str) -> dict:
    link = _frontend(f"/app/reset-password?token={token}")
    company = getattr(tenant, "company_name", None) or getattr(tenant, "name", "your team")
    logger.info("[email:link] invite for %s (tenant=%s) -> %s", user.email, company, link)
    subject = f"You've been invited to {company} on BaseCenter.ai"
    text = (
        f"Hi {user.full_name or ''},\n\n"
        f"You've been invited to join {company} on BaseCenter.ai.\n\n"
        f"Set your password and get started using the link below:\n\n{link}\n\n"
        f"This link expires in {settings.INVITE_TOKEN_EXPIRE_HOURS // 24} days."
    )
    html = (
        f"<p>Hi {user.full_name or ''},</p>"
        f"<p>You've been invited to join <strong>{company}</strong> on BaseCenter.ai.</p>"
        f'<p><a href="{link}">Set your password</a></p>'
    )
    return send_email(db, user.email, subject, text, html)


def send_test_email(db: Session, to: str) -> dict:
    subject = "BaseCenter.ai test email"
    text = (
        "This is a test email from BaseCenter.ai.\n\n"
        "If you received this, your SMTP configuration is working correctly."
    )
    html = "<p>This is a <strong>test email</strong> from BaseCenter.ai.</p>"
    return send_email(db, to, subject, text, html)


# Purposes re-exported for callers that mint invite tokens directly.
INVITE_PURPOSE = PURPOSE_INVITE
RESET_PURPOSE = PURPOSE_PASSWORD_RESET
VERIFY_PURPOSE = PURPOSE_VERIFY_EMAIL
