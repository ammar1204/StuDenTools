"""
Rate limiting middleware for StuDenTools API.
Uses slowapi to protect endpoints from abuse.
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse

# Create limiter instance with IP-based identification
limiter = Limiter(key_func=get_remote_address)

# Rate limit configurations for different endpoint types
RATE_LIMITS = {
    "ai": "10/minute",           # AI endpoints (paraphrase, citation)
    "file_processing": "20/minute",  # PDF/image processing
    "lightweight": "60/minute",   # GPA, health, etc.
}


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors."""
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": f"Too many requests. Please try again later.",
            "retry_after": exc.detail
        }
    )


def setup_rate_limiting(app):
    """Configure rate limiting for the FastAPI app."""
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
