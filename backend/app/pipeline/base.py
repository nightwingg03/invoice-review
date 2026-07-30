from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path
from typing import Protocol

from pydantic import BaseModel, ConfigDict

from app.invoices.validation import FinancialValidationResult
from app.pipeline.classification import DocumentClassification
from app.pipeline.gl_categorization import GlSuggestion
from app.schemas.common import MANIFEST_FIELD_NAMES, flatten_extracted_fields
from app.schemas.invoices.models import InvoiceDocument
from app.schemas.receipts.models import ReceiptDocument


def build_extraction_summary(
    document: InvoiceDocument | ReceiptDocument | None,
) -> dict[str, str | None] | None:
    if document is None:
        return None

    summary = flatten_extracted_fields(document, MANIFEST_FIELD_NAMES)
    line_items = getattr(document, "line_items", [])
    summary["line_item_count"] = str(len(line_items)) if line_items else "0"
    return summary


def build_validation_summary(
    validation_res: FinancialValidationResult | None,
) -> dict[str, object] | None:
    if validation_res is None:
        return None

    vat_checks: list[dict[str, object]] = []
    if validation_res.vendor_vat and validation_res.vendor_vat.vat_id:
        vat_checks.append(
            {
                "vat_id": validation_res.vendor_vat.vat_id,
                "field": "vendor_tax_id",
                "is_valid": validation_res.vendor_vat.is_valid,
                "country_code": validation_res.vendor_vat.country_code,
                "reason": validation_res.vendor_vat.reason,
            }
        )
    if validation_res.customer_vat and validation_res.customer_vat.vat_id:
        vat_checks.append(
            {
                "vat_id": validation_res.customer_vat.vat_id,
                "field": "customer_tax_id",
                "is_valid": validation_res.customer_vat.is_valid,
                "country_code": validation_res.customer_vat.country_code,
                "reason": validation_res.customer_vat.reason,
            }
        )

    findings: list[str] = []
    if (
        validation_res.vendor_vat
        and validation_res.vendor_vat.is_valid is False
    ):
        findings.append(
            f"Vendor VAT invalid: {validation_res.vendor_vat.reason}"
        )
    if (
        validation_res.customer_vat
        and validation_res.customer_vat.is_valid is False
    ):
        findings.append(
            f"Customer VAT invalid: {validation_res.customer_vat.reason}"
        )
    if validation_res.totals and validation_res.totals.status == "invalid":
        findings.append(f"Totals mismatch: {validation_res.totals.reason}")

    totals_dict = (
        validation_res.totals.model_dump(mode="json")
        if validation_res.totals
        else None
    )

    return {
        "findings": findings,
        "vat_checks": vat_checks,
        "totals_check": totals_dict,
    }

class PipelineContext(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    document_path: Path
    classification: DocumentClassification | None = None
    extraction: InvoiceDocument | ReceiptDocument | None = None
    validation: FinancialValidationResult | None = None
    gl_suggestion: GlSuggestion | None = None

    def to_summary_dict(self) -> dict[str, object]:
        return {
            "document_path": str(self.document_path),
            "classification": (
                self.classification.model_dump(mode="json")
                if self.classification
                else None
            ),
            "extraction_summary": build_extraction_summary(self.extraction),
            "validation": build_validation_summary(self.validation),
            "gl_suggestion": (
                self.gl_suggestion.model_dump(mode="json")
                if self.gl_suggestion
                else None
            ),
        }


class PipelineStep(Protocol):
    name: str

    def run(self, ctx: PipelineContext) -> PipelineContext:
        ...


class Pipeline:
    def __init__(self, steps: Sequence[PipelineStep]) -> None:
        self.steps = list(steps)

    def run(self, document_path: Path | str) -> PipelineContext:
        path = Path(document_path)
        ctx = PipelineContext(document_path=path)
        total_steps = len(self.steps)
        print(f"\n[Pipeline] Starting execution on '{path.name}' ({total_steps} steps)")
        for idx, step in enumerate(self.steps, 1):
            step_name = getattr(step, "name", step.__class__.__name__)
            print(f"[Pipeline] Step {idx}/{total_steps}: Executing '{step_name}'...")
            ctx = step.run(ctx)
            print(f"[Pipeline] Step {idx}/{total_steps}: Finished '{step_name}'.")
        print("[Pipeline] Execution completed successfully!\n")
        return ctx
