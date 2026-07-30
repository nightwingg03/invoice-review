"""Database-only layer for DocumentRecord.

Nothing outside this module should touch the SQLAlchemy session directly.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.documents.models import DocumentRecord


class DocumentRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    # ------------------------------------------------------------------
    # Writes
    # ------------------------------------------------------------------

    def create(self, record: DocumentRecord) -> DocumentRecord:
        self._session.add(record)
        self._session.commit()
        self._session.refresh(record)
        return record

    def save(self, record: DocumentRecord) -> DocumentRecord:
        """Persist an already-tracked record (update path)."""
        self._session.add(record)
        self._session.commit()
        self._session.refresh(record)
        return record

    def delete(self, record: DocumentRecord) -> None:
        self._session.delete(record)
        self._session.commit()

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------

    def get_by_id(self, doc_id: str) -> DocumentRecord | None:
        return self._session.get(DocumentRecord, doc_id)

    def list_all(self) -> list[DocumentRecord]:
        from sqlalchemy import select

        stmt = select(DocumentRecord).order_by(DocumentRecord.created_at.desc())
        return list(self._session.scalars(stmt))

    def find_duplicate(
        self,
        vendor_name: str,
        invoice_number: str,
        exclude_id: str | None = None,
    ) -> DocumentRecord | None:
        """Return any existing record with matching vendor + invoice number."""
        from sqlalchemy import select

        stmt = (
            select(DocumentRecord)
            .where(DocumentRecord.vendor_name == vendor_name)
            .where(DocumentRecord.invoice_number == invoice_number)
        )
        if exclude_id:
            stmt = stmt.where(DocumentRecord.id != exclude_id)
        return self._session.scalars(stmt).first()
