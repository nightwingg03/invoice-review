"""Map Document Intelligence output and manifest fixtures into Pydantic schemas."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

PLAYGROUND_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = PLAYGROUND_ROOT.parent / "backend"
REPO_ROOT = PLAYGROUND_ROOT.parent
SAMPLES_DIR = REPO_ROOT / "samples"
MANIFEST_PATH = SAMPLES_DIR / "manifest.json"

sys.path.append(str(BACKEND_ROOT))

from app.schemas.invoices.mapping import from_analysis, from_manifest  # noqa: E402
from app.schemas.receipts.mapping import from_analysis as receipt_from_analysis  # noqa: E402
from app.schemas.receipts.mapping import from_manifest as receipt_from_manifest  # noqa: E402
from app.services.document_intelligence_service import DocumentIntelligenceService  # noqa: E402

SAMPLE_INVOICE = SAMPLES_DIR / "sample-invoice.pdf"
FUEL_RECEIPT = SAMPLES_DIR / "13-nl-fuel-receipt.png"


def load_manifest_entry(filename: str) -> dict[str, Any]:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    for entry in manifest:
        if entry["filename"] == filename:
            return entry
    raise KeyError(f"No manifest entry found for {filename}")


def run_manifest_fixture(
    filename: str,
    mapper: Any,
) -> None:
    entry = load_manifest_entry(filename)
    document = mapper(entry["expected"])
    print(f"[fixture] {filename}")
    print(json.dumps(document.model_dump(mode="json"), indent=2))
    print()


def run_live_invoice() -> None:
    if not SAMPLE_INVOICE.is_file():
        print(f"[live-invoice] skipped: {SAMPLE_INVOICE} not found")
        print()
        return

    service = DocumentIntelligenceService()
    analysis = service.analyze_invoice(SAMPLE_INVOICE)
    document = from_analysis(analysis)
    print(f"[live-invoice] {SAMPLE_INVOICE.name}")
    print(json.dumps(document.model_dump(mode="json"), indent=2))
    print()


def run_live_receipt() -> None:
    if not FUEL_RECEIPT.is_file():
        print(f"[live-receipt] skipped: {FUEL_RECEIPT} not found")
        print()
        return

    service = DocumentIntelligenceService()
    analysis = service.analyze_receipt(FUEL_RECEIPT)
    document = receipt_from_analysis(analysis)
    print(f"[live-receipt] {FUEL_RECEIPT.name}")
    print(json.dumps(document.model_dump(mode="json"), indent=2))
    print()


def main() -> None:
    run_manifest_fixture("01-en-happy-classic.pdf", from_manifest)
    run_manifest_fixture("13-nl-fuel-receipt.png", receipt_from_manifest)
    run_live_invoice()
    run_live_receipt()


if __name__ == "__main__":
    main()
