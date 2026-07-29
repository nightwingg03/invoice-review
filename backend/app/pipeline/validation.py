from __future__ import annotations

from typing import TYPE_CHECKING

from app.invoices.validation import validate_financial_document

if TYPE_CHECKING:
    from app.pipeline.base import PipelineContext


class ValidationStep:
    name: str = "validation"

    def run(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.extraction is None:
            raise ValueError(
                "Extraction step must be run before ValidationStep"
            )

        doc_type = getattr(ctx.extraction, "document_type", "unknown")
        print(f"  -> Validation: Running financial rules for '{doc_type}'...")
        ctx.validation = validate_financial_document(ctx.extraction)
        totals_status = (
            ctx.validation.totals.status if ctx.validation.totals else "N/A"
        )
        vendor_vat_valid = (
            ctx.validation.vendor_vat.is_valid
            if ctx.validation.vendor_vat
            else "N/A"
        )
        print(
            f"  -> Validation: Summary [Totals Status: {totals_status},"
            f" Vendor VAT Valid: {vendor_vat_valid}]"
        )
        return ctx
