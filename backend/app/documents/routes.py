"""HTTP layer for /api/documents.

Speaks HTTP only: request parsing, response shaping, status codes.
All business logic lives in DocumentService.
"""

from __future__ import annotations

import json
from collections.abc import Generator
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.documents.repository import DocumentRepository
from app.documents.schemas import (
    AccountingOverrideRequest,
    CorrectionEmailResponse,
    CorrectionRequest,
    DecisionRequest,
    DocumentResponse,
)
from app.documents.service import (
    DocumentNotFoundError,
    DocumentService,
    FileTooLargeError,
    UnsupportedFileTypeError,
)

document_router = APIRouter(prefix="/api/documents", tags=["documents"])


# ---------------------------------------------------------------------------
# Dependency helpers
# ---------------------------------------------------------------------------


def get_session(request: Request) -> Generator[Session, None, None]:
    session: Session = request.app.state.session_factory()
    try:
        yield session
    finally:
        session.close()


def get_service(
    request: Request,
    session: Session = Depends(get_session),  # noqa: B008
) -> DocumentService:
    repo = DocumentRepository(session)
    return DocumentService(repo, request.app.state.config)


# ---------------------------------------------------------------------------
# Response mapping
# ---------------------------------------------------------------------------


def _to_response(record) -> DocumentResponse:  # type: ignore[return]
    def _load(value: str | None) -> object:
        return json.loads(value) if value else None

    issues_raw = _load(record.issues)
    issues = issues_raw if isinstance(issues_raw, list) else None

    return DocumentResponse(
        id=record.id,
        filename=record.filename,
        status=record.status,
        document_type=record.document_type,
        classification=_load(record.classification),
        extraction=_load(record.extraction),
        validation=_load(record.validation),
        gl_suggestion=_load(record.gl_suggestion),
        review_data=_load(record.review_data),
        issues=issues,
        vendor_name=record.vendor_name,
        invoice_number=record.invoice_number,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@document_router.post("", status_code=status.HTTP_201_CREATED, response_model=DocumentResponse)
async def upload_document(
    file: UploadFile,
    service: DocumentService = Depends(get_service),  # noqa: B008
) -> DocumentResponse:
    """Upload a document and run the full pipeline."""
    try:
        record = await service.upload_and_process(file)
    except UnsupportedFileTypeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    except FileTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc)
        ) from exc
    return _to_response(record)


@document_router.get("", response_model=list[DocumentResponse])
def list_documents(
    service: DocumentService = Depends(get_service),  # noqa: B008
) -> list[DocumentResponse]:
    """List saved reviews, newest first."""
    return [_to_response(r) for r in service.list_documents()]


@document_router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: str,
    service: DocumentService = Depends(get_service),  # noqa: B008
) -> DocumentResponse:
    """Fetch one review by ID."""
    try:
        return _to_response(service.get_document(doc_id))
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@document_router.get("/{doc_id}/file")
def serve_file(
    doc_id: str,
    service: DocumentService = Depends(get_service),  # noqa: B008
) -> FileResponse:
    """Serve the stored upload file."""
    try:
        record = service.get_document(doc_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    file_path = Path(record.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored file not found on disk.",
        )
    return FileResponse(str(file_path), filename=record.filename)


@document_router.put("/{doc_id}", response_model=DocumentResponse)
def update_document(
    doc_id: str,
    body: CorrectionRequest,
    service: DocumentService = Depends(get_service),  # noqa: B008
) -> DocumentResponse:
    """Apply field corrections and revalidate."""
    try:
        record = service.apply_corrections(doc_id, body.corrections)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return _to_response(record)


@document_router.put("/{doc_id}/accounting", response_model=DocumentResponse)
def update_accounting(
    doc_id: str,
    body: AccountingOverrideRequest,
    service: DocumentService = Depends(get_service),  # noqa: B008
) -> DocumentResponse:
    """Confirm or override the GL account."""
    try:
        record = service.override_gl(doc_id, body.account_code, body.note)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return _to_response(record)


@document_router.post("/{doc_id}/decision", response_model=DocumentResponse)
def set_decision(
    doc_id: str,
    body: DecisionRequest,
    service: DocumentService = Depends(get_service),  # noqa: B008
) -> DocumentResponse:
    """Approve or reject a document review."""
    try:
        record = service.set_decision(doc_id, body.decision, body.note)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return _to_response(record)


@document_router.post("/{doc_id}/correction-email", response_model=CorrectionEmailResponse)
def draft_correction_email(
    doc_id: str,
    service: DocumentService = Depends(get_service),  # noqa: B008
) -> CorrectionEmailResponse:
    """Draft a supplier correction email from recorded issues."""
    try:
        draft = service.draft_correction_email(doc_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return CorrectionEmailResponse(draft=draft)


@document_router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: str,
    service: DocumentService = Depends(get_service),  # noqa: B008
) -> None:
    """Delete a review and its stored file."""
    try:
        service.delete_document(doc_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
