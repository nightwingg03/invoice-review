"""Simple password-based authentication module.

Loads APP_PASSWORD from environment variables or credentials.txt in root repository.
Exposes POST /api/auth/login and GET /api/auth/verify endpoints.
"""

from __future__ import annotations

import hashlib
import os
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel

auth_router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_app_password() -> str:
    """Load APP_PASSWORD from environment variable or credentials.txt."""
    env_pass = os.getenv("APP_PASSWORD")
    if env_pass:
        return env_pass.strip()

    # Search for credentials.txt in root repo
    root_dir = Path(__file__).resolve().parents[2]
    cred_file = root_dir / "credentials.txt"
    if cred_file.exists():
        for line in cred_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("APP_PASSWORD="):
                return line.split("=", 1)[1].strip()

    return "Northstar2026!Review"


def generate_auth_token(password: str) -> str:
    """Generate deterministic session token from valid password."""
    return hashlib.sha256(f"invoice-review-salt:{password}".encode()).hexdigest()


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str
    status: str = "ok"


@auth_router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    """Verify password and return authentication token."""
    expected_password = get_app_password()
    if body.password != expected_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password.",
        )
    token = generate_auth_token(expected_password)
    return LoginResponse(token=token)


@auth_router.get("/verify")
def verify(authorization: str = Header(None)) -> dict[str, bool]:
    """Verify if the provided Authorization bearer token is valid."""
    expected_password = get_app_password()
    valid_token = generate_auth_token(expected_password)

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token == valid_token:
            return {"valid": True}

    return {"valid": False}
