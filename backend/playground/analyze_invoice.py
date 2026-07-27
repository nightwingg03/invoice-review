"""Live Document Intelligence playground runner."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from app.schemas.invoices.mapping import field_values, from_analysis
from app.services.document_intelligence_service import DocumentIntelligenceService

PLAYGROUND_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = PLAYGROUND_ROOT.parent
REPO_ROOT = BACKEND_ROOT.parent
SAMPLES_DIR = REPO_ROOT / "samples"

DEFAULT_SAMPLE_INVOICE = SAMPLES_DIR / "sample-invoice.pdf"
DEFAULT_CORPUS_INVOICE = SAMPLES_DIR / "01-en-happy-classic.pdf"
SAMPLE_DOWNLOAD_COMMAND = (
    "curl -L "
    "https://raw.githubusercontent.com/Azure-Samples/cognitive-services-REST-api-samples/"
    "master/curl/form-recognizer/sample-invoice.pdf "
    f"-o {DEFAULT_SAMPLE_INVOICE.as_posix()}"
)


def resolve_invoice_path(document_path: Path | str | None = None) -> Path:
    if document_path is not None:
        candidate = Path(document_path).expanduser()
        if candidate.is_absolute():
            resolved = candidate.resolve()
        elif len(candidate.parts) == 1:
            resolved = next(
                (
                    (root / candidate).resolve()
                    for root in (SAMPLES_DIR, Path.cwd(), PLAYGROUND_ROOT, REPO_ROOT)
                    if (root / candidate).is_file()
                ),
                (Path.cwd() / candidate).resolve(),
            )
        else:
            search_roots = (Path.cwd(), PLAYGROUND_ROOT, BACKEND_ROOT, REPO_ROOT)
            resolved = next(
                (
                    (root / candidate).resolve()
                    for root in search_roots
                    if (root / candidate).is_file()
                ),
                (Path.cwd() / candidate).resolve(),
            )

        if not resolved.is_file():
            raise FileNotFoundError(f"Invoice file not found: {resolved}")
        return resolved

    for candidate in (DEFAULT_SAMPLE_INVOICE, DEFAULT_CORPUS_INVOICE):
        if candidate.is_file():
            return candidate

    raise FileNotFoundError(
        "No sample invoice found. Download Microsoft's sample with:\n"
        f"{SAMPLE_DOWNLOAD_COMMAND}"
    )


def build_analysis_payload(analysis: dict[str, Any], source_file: Path) -> dict[str, Any]:
    document = from_analysis(analysis)
    payload = dict(analysis)
    payload["source_file"] = str(source_file)
    payload["normalized_fields"] = field_values(document)
    payload["invoice_document"] = document.model_dump(mode="json")
    return payload


def main() -> None:
    document_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    resolved_path = resolve_invoice_path(document_path)

    print(f"Analyzing invoice: {resolved_path}")
    service = DocumentIntelligenceService()
    analysis = service.analyze_invoice(resolved_path)
    payload = build_analysis_payload(analysis, resolved_path)
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
