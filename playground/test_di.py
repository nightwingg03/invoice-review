"""Quick Document Intelligence smoke test using backend/.env settings."""

from __future__ import annotations

import sys
from pathlib import Path

PLAYGROUND_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = PLAYGROUND_ROOT.parent / "backend"
REPO_ROOT = PLAYGROUND_ROOT.parent
SAMPLES_DIR = REPO_ROOT / "samples"
DEFAULT_SAMPLE = SAMPLES_DIR / "sample-invoice.pdf"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.schemas.invoices.mapping import field_values, from_analysis  # noqa: E402
from app.services.document_intelligence_service import DocumentIntelligenceService  # noqa: E402


def resolve_document_path(document_path: Path | str | None = None) -> Path:
    if document_path is not None:
        resolved = Path(document_path).expanduser().resolve()
        if not resolved.is_file():
            raise FileNotFoundError(f"Document not found: {resolved}")
        return resolved

    if DEFAULT_SAMPLE.is_file():
        return DEFAULT_SAMPLE

    raise FileNotFoundError(
        "Pass a document path, or download the Microsoft sample to "
        f"{DEFAULT_SAMPLE.as_posix()}"
    )


def main() -> None:
    resolved_path = resolve_document_path(sys.argv[1] if len(sys.argv) > 1 else None)

    service = DocumentIntelligenceService()
    analysis = service.analyze_invoice(resolved_path)
    document = from_analysis(analysis)
    normalized = field_values(document)

    print(f"file: {resolved_path.name}")
    print(f"vendor_name: {normalized.get('vendor_name')}")
    print(f"invoice_number: {normalized.get('invoice_number')}")
    print(f"invoice_total: {normalized.get('invoice_total')}")
    print(f"average_confidence: {document.average_confidence}")


if __name__ == "__main__":
    main()
