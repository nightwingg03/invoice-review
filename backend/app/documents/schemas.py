"""Pydantic request/response schemas for the documents HTTP layer.

These are deliberately decoupled from both the SQLAlchemy ORM models and
the pipeline domain models so that the HTTP contract can evolve independently.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class DocumentResponse(BaseModel):
    """Full review record returned to API clients."""

    id: str
    filename: str
    status: str
    document_type: str | None

    # Pipeline stage payloads (raw JSON objects stored as-is)
    classification: object | None = None
    extraction: object | None = None
    validation: object | None = None
    gl_suggestion: object | None = None

    # Human review state
    review_data: object | None = None
    issues: list[str] | None = None

    # Duplicate-detection normalised fields
    vendor_name: str | None = None
    invoice_number: str | None = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GlAccountItem(BaseModel):
    code: str
    description: str


class CorrectionEmailResponse(BaseModel):
    draft: str


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------


class CorrectionRequest(BaseModel):
    """Field-level corrections applied by a reviewer to extracted data."""

    corrections: dict[str, object] = Field(
        ...,
        description="Mapping of field name → corrected value.",
        examples=[{"vendor_name": "ACME Corp", "invoice_total": "1234.56"}],
    )


class AccountingOverrideRequest(BaseModel):
    """Confirm or override the GL account code suggested by the pipeline."""

    account_code: str = Field(
        ...,
        description="A valid GL account code from the catalog (e.g. '4000').",
        examples=["4300"],
    )
    note: str | None = Field(
        None,
        description="Optional reviewer note explaining the override.",
    )


class DecisionRequest(BaseModel):
    """Approve or reject a document review."""

    decision: str = Field(
        ...,
        description="Either 'approved' or 'rejected'.",
        pattern="^(approved|rejected)$",
    )
    note: str | None = Field(
        None,
        description="Optional reviewer note.",
    )
