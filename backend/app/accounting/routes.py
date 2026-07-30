"""HTTP layer for /api/accounting."""

from __future__ import annotations

from fastapi import APIRouter

from app.accounting.catalog import GL_ACCOUNT_DESCRIPTIONS, GlAccountCode
from app.documents.schemas import GlAccountItem

accounting_router = APIRouter(prefix="/api/accounting", tags=["accounting"])


@accounting_router.get("/gl-accounts", response_model=list[GlAccountItem])
def list_gl_accounts() -> list[GlAccountItem]:
    """Return the fixed GL account catalog."""
    return [
        GlAccountItem(code=code.value, description=description)
        for code, description in GL_ACCOUNT_DESCRIPTIONS.items()
        if isinstance(code, GlAccountCode)
    ]
