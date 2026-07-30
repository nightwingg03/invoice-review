"""Orchestration layer.

Owns the business rules that sit between the HTTP routes and the database:
upload validation, pipeline execution, duplicate detection, corrections,
GL override, and decision recording.

Raises typed errors; routes map those to HTTP status codes.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from pathlib import Path
from typing import TYPE_CHECKING

from fastapi import UploadFile

from app.documents.models import DocumentRecord
from app.documents.repository import DocumentRepository
from app.pipeline import build_default_pipeline
from app.security import InvalidFileContentError, validate_file_magic_bytes

if TYPE_CHECKING:
    from app.config import AppConfig

# ---------------------------------------------------------------------------
# Typed service errors
# ---------------------------------------------------------------------------

MAX_FILE_BYTES = 4 * 1024 * 1024  # 4 MB
ALLOWED_CONTENT_TYPES = {"application/pdf", "image/jpeg", "image/png"}


class DocumentServiceError(Exception):
    """Base class for service-level errors."""


class DocumentNotFoundError(DocumentServiceError):
    def __init__(self, doc_id: str) -> None:
        super().__init__(f"Document '{doc_id}' not found.")
        self.doc_id = doc_id


class UnsupportedFileTypeError(DocumentServiceError):
    def __init__(self, content_type: str) -> None:
        super().__init__(
            f"Unsupported file type '{content_type}'. "
            f"Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
        )
        self.content_type = content_type


class FileTooLargeError(DocumentServiceError):
    def __init__(self, size: int) -> None:
        super().__init__(
            f"File size {size} bytes exceeds the 4 MB limit."
        )
        self.size = size


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class DocumentService:
    def __init__(self, repository: DocumentRepository, config: AppConfig) -> None:
        self._repo = repository
        self._config = config

    # ------------------------------------------------------------------
    # Upload + pipeline
    # ------------------------------------------------------------------

    async def upload_and_process(self, file: UploadFile) -> DocumentRecord:
        # 1. Validate content type
        ct = file.content_type or ""
        if ct not in ALLOWED_CONTENT_TYPES:
            raise UnsupportedFileTypeError(ct)

        # 2. Read bytes + validate size
        data = await file.read()
        if len(data) > MAX_FILE_BYTES:
            raise FileTooLargeError(len(data))

        # 3. Magic Bytes Inspection (prevents Content-Type header spoofing)
        try:
            validate_file_magic_bytes(data, ct)
        except InvalidFileContentError as exc:
            raise UnsupportedFileTypeError(str(exc)) from exc

        # 4. Save to disk with Path Traversal Protection
        upload_dir_resolved = self._config.upload_dir.resolve()
        upload_dir_resolved.mkdir(parents=True, exist_ok=True)

        safe_name = Path(file.filename or "upload").name
        dest = (upload_dir_resolved / f"{uuid.uuid4()}_{safe_name}").resolve()

        if not dest.is_relative_to(upload_dir_resolved):
            raise UnsupportedFileTypeError("Invalid destination path: Path traversal detected.")

        dest.write_bytes(data)

        # 4. Persist a pending record
        record = DocumentRecord(
            filename=safe_name,
            file_path=str(dest),
            status="pending",
        )
        record = self._repo.create(record)

        # 5. Run the pipeline in a thread so pydantic-ai agents get their
        # own clean event loop — avoids anyio cancel-scope conflicts with
        # FastAPI's running loop.
        try:
            loop = asyncio.get_event_loop()
            pipeline = build_default_pipeline()
            ctx = await loop.run_in_executor(None, pipeline.run, dest)
            summary = ctx.to_summary_dict()

            # Map pipeline stages onto the record
            record.classification = _dump(summary.get("classification"))
            record.extraction = _dump(summary.get("extraction_summary"))
            record.validation = _dump(summary.get("validation"))
            record.gl_suggestion = _dump(summary.get("gl_suggestion"))

            # Populate indexed columns from classification + extraction summary
            clf = summary.get("classification") or {}
            record.document_type = clf.get("document_type")

            ext = summary.get("extraction_summary") or {}
            raw_vendor = ext.get("vendor_name")
            raw_inv = ext.get("invoice_id")
            record.vendor_name = _normalize(raw_vendor)
            record.invoice_number = _normalize(raw_inv)

            # 6. Duplicate detection
            issues: list[str] = []
            if record.vendor_name and record.invoice_number:
                dup = self._repo.find_duplicate(
                    record.vendor_name,
                    record.invoice_number,
                    exclude_id=record.id,
                )
                if dup:
                    issues.append(
                        f"Possible duplicate of document '{dup.id}' "
                        f"(same vendor + invoice number)."
                    )

            record.issues = json.dumps(issues) if issues else None
            record.status = "processed"

        except Exception as exc:  # noqa: BLE001
            record.status = "failed"
            record.issues = json.dumps([f"Pipeline error: {exc}"])

        return self._repo.save(record)

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------

    def get_document(self, doc_id: str) -> DocumentRecord:
        record = self._repo.get_by_id(doc_id)
        if record is None:
            raise DocumentNotFoundError(doc_id)
        return record

    def list_documents(self) -> list[DocumentRecord]:
        return self._repo.list_all()

    # ------------------------------------------------------------------
    # Mutations
    # ------------------------------------------------------------------

    def delete_document(self, doc_id: str) -> None:
        record = self.get_document(doc_id)
        file_path = Path(record.file_path)
        self._repo.delete(record)
        if file_path.exists():
            file_path.unlink(missing_ok=True)

    def apply_corrections(
        self, doc_id: str, corrections: dict[str, object]
    ) -> DocumentRecord:
        """Merge field corrections into review_data."""
        record = self.get_document(doc_id)
        existing: dict[str, object] = json.loads(record.review_data or "{}")
        existing.update(corrections)
        record.review_data = json.dumps(existing)
        return self._repo.save(record)

    def override_gl(self, doc_id: str, account_code: str, note: str | None) -> DocumentRecord:
        """Confirm or override the GL account code."""
        record = self.get_document(doc_id)
        gl: dict[str, object] = json.loads(record.gl_suggestion or "{}")
        gl["account_code"] = account_code
        gl["confirmed"] = True
        if note:
            gl["reviewer_note"] = note
        record.gl_suggestion = json.dumps(gl)
        return self._repo.save(record)

    def set_decision(
        self, doc_id: str, decision: str, note: str | None
    ) -> DocumentRecord:
        """Record approve / reject decision."""
        record = self.get_document(doc_id)
        data: dict[str, object] = json.loads(record.review_data or "{}")
        data["decision"] = decision
        if note:
            data["decision_note"] = note
        record.review_data = json.dumps(data)
        record.status = decision  # "approved" | "rejected"
        return self._repo.save(record)

    def draft_correction_email(self, doc_id: str) -> str:
        """Build a plain-text correction-request email from recorded issues."""
        record = self.get_document(doc_id)
        issues: list[str] = json.loads(record.issues or "[]")
        vendor = record.vendor_name or "Supplier"
        inv = record.invoice_number or "N/A"

        if not issues:
            body = (
                f"Dear {vendor},\n\n"
                f"We are writing regarding invoice {inv}.\n"
                "Our review did not identify any specific issues, but "
                "please feel free to contact us with any questions.\n\n"
                "Kind regards,\nNorthstar Facilities B.V."
            )
        else:
            bullet_lines = "\n".join(f"  • {i}" for i in issues)
            body = (
                f"Dear {vendor},\n\n"
                f"We are writing regarding invoice {inv}. "
                "During our review we identified the following issues "
                "that require your attention:\n\n"
                f"{bullet_lines}\n\n"
                "Please review and reissue the corrected document at your "
                "earliest convenience.\n\n"
                "Kind regards,\nNorthstar Facilities B.V."
            )
        return body


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _dump(obj: object) -> str | None:
    if obj is None:
        return None
    return json.dumps(obj)


def _normalize(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    return normalized or None
