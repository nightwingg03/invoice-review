from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class DocumentRecord(Base):
    __tablename__ = "documents"

    # --- Identity ---
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    filename: Mapped[str] = mapped_column(String, nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    document_type: Mapped[str | None] = mapped_column(String, nullable=True)

    # --- Pipeline stage JSON columns ---
    classification: Mapped[str | None] = mapped_column(Text, nullable=True)
    extraction: Mapped[str | None] = mapped_column(Text, nullable=True)
    validation: Mapped[str | None] = mapped_column(Text, nullable=True)
    gl_suggestion: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- Working review state ---
    review_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    issues: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- Normalised columns for duplicate detection (indexed) ---
    vendor_name: Mapped[str | None] = mapped_column(String, nullable=True)
    invoice_number: Mapped[str | None] = mapped_column(String, nullable=True)

    # --- Timestamps ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        Index("ix_documents_vendor_name", "vendor_name"),
        Index("ix_documents_invoice_number", "invoice_number"),
    )

    def __repr__(self) -> str:
        return (
            f"<DocumentRecord id={self.id!r} filename={self.filename!r}"
            f" status={self.status!r}>"
        )
