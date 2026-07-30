"""Security module for input validation, security headers, and rate limiting.

Implements:
1. Binary Magic Bytes inspection for PDF, JPEG, and PNG uploads.
2. HTTP Security Headers middleware (X-Content-Type-Options, X-Frame-Options, etc.).
3. Sliding window IP Rate Limiter (5 uploads per 5 minutes per IP).
"""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

# Magic Byte signatures
MAGIC_SIGNATURES: dict[str, list[bytes]] = {
    "application/pdf": [b"%PDF-"],
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
}


class InvalidFileContentError(Exception):
    """Raised when file binary bytes do not match expected MIME signature."""


def validate_file_magic_bytes(content: bytes, content_type: str) -> None:
    """Verify that actual binary header bytes match the declared content type."""
    if not content:
        raise InvalidFileContentError("Uploaded file is empty (0 bytes).")

    expected_signatures = MAGIC_SIGNATURES.get(content_type)
    if not expected_signatures:
        raise InvalidFileContentError(f"Unsupported content type '{content_type}'.")

    matches = any(content.startswith(sig) for sig in expected_signatures)
    if not matches:
        raise InvalidFileContentError(
            f"File contents do not match valid magic bytes for '{content_type}'."
        )


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inject standard HTTP security hardening headers into all responses."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


class RateLimiter:
    """Sliding window IP Rate Limiter (e.g. 5 requests per 300 seconds per IP)."""

    def __init__(self, max_requests: int = 5, window_seconds: int = 300) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._history: dict[str, list[float]] = defaultdict(list)

    def check_rate_limit(self, request: Request) -> None:
        client_ip = request.headers.get("x-forwarded-for")
        if client_ip:
            client_ip = client_ip.split(",")[0].strip()
        elif request.client:
            client_ip = request.client.host
        else:
            client_ip = "127.0.0.1"

        now = time.time()
        window_start = now - self.window_seconds

        # Clean timestamps older than window_seconds
        timestamps = [t for t in self._history[client_ip] if t > window_start]

        if len(timestamps) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Rate limit exceeded. Maximum {self.max_requests} uploads "
                    f"per {self.window_seconds // 60} minutes per IP allowed."
                ),
            )

        timestamps.append(now)
        self._history[client_ip] = timestamps


# Default global instance for 5 uploads / 5 minutes (300 seconds)
UPLOAD_RATE_LIMITER = RateLimiter(max_requests=5, window_seconds=300)
