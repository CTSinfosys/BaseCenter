"""
In-process rate limiting (Phase 1H) built on slowapi.

A single shared Limiter is created here and wired into the app in main.py. Limits
are per-client-IP and configurable via env (see config.Settings). Limiting can be
disabled wholesale with RATE_LIMIT_ENABLED=false (useful for load tests).
"""
from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    enabled=settings.RATE_LIMIT_ENABLED,
    # headers_enabled left False: injecting rate-limit headers requires every
    # decorated endpoint to declare a `response: Response` param, which we avoid.
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Return a clear, JSON 429 response instead of slowapi's default."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please slow down and try again shortly.",
        },
    )
