from __future__ import annotations

from typing import TYPE_CHECKING

from app.schemas.invoices.mapping import from_analysis as map_invoice
from app.schemas.receipts.mapping import from_analysis as map_receipt
from app.services.document_intelligence_service import DocumentIntelligenceService

if TYPE_CHECKING:
    from app.pipeline.base import PipelineContext


class ExtractionStep:
    name: str = "extraction"

    def __init__(self, di_service: DocumentIntelligenceService | None = None) -> None:
        self._di_service = di_service or DocumentIntelligenceService()

    def run(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.classification is None:
            raise ValueError(
                "Classification step must be run before ExtractionStep"
            )

        doc_type = ctx.classification.document_type
        print(
            f"  -> Document classified as '{doc_type}'"
            f" (confidence: {ctx.classification.confidence:.2f})"
        )
        if doc_type == "invoice":
            print(
                "  -> Extraction: Calling Azure Document Intelligence"
                " (prebuilt-invoice)..."
            )
            analysis = self._di_service.analyze_invoice(ctx.document_path)
            ctx.extraction = map_invoice(analysis)
            print("  -> Extraction: Mapped to InvoiceDocument schema.")
        elif doc_type == "receipt":
            print(
                "  -> Extraction: Calling Azure Document Intelligence"
                " (prebuilt-receipt)..."
            )
            analysis = self._di_service.analyze_receipt(ctx.document_path)
            ctx.extraction = map_receipt(analysis)
            print("  -> Extraction: Mapped to ReceiptDocument schema.")
        else:
            raise ValueError(f"Unsupported document type: {doc_type}")

        return ctx
