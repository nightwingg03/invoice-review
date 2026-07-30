from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict
from stdnum.eu import vat as eu_vat

from app.schemas.invoices.models import InvoiceDocument
from app.schemas.receipts.models import ReceiptDocument


class VatCheck(BaseModel):
    model_config = ConfigDict(extra="forbid")

    vat_id: str | None = None
    is_valid: bool | None = None
    country_code: str | None = None
    reason: str | None = None


class TotalsCheck(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["valid", "invalid", "incomplete"]
    subtotal: Decimal | None = None
    total_tax: Decimal | None = None
    expected_total: Decimal | None = None
    actual_total: Decimal | None = None
    difference: Decimal | None = None
    reason: str | None = None


class FinancialValidationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    vendor_vat: VatCheck | None = None
    customer_vat: VatCheck | None = None
    totals: TotalsCheck | None = None


def validate_eu_vat(vat_id: str | None) -> VatCheck:
    if not vat_id or not vat_id.strip():
        return VatCheck(vat_id=None, is_valid=None, reason="VAT ID not present")

    clean_vat = vat_id.strip()
    try:
        is_valid = bool(eu_vat.is_valid(clean_vat))
        country_code = (
            clean_vat[:2].upper()
            if len(clean_vat) >= 2 and clean_vat[:2].isalpha()
            else None
        )
        reason = (
            "Valid EU VAT format/checksum"
            if is_valid
            else "Invalid EU VAT format or checksum"
        )
        return VatCheck(
            vat_id=clean_vat,
            is_valid=is_valid,
            country_code=country_code,
            reason=reason,
        )
    except Exception as exc:
        return VatCheck(
            vat_id=clean_vat,
            is_valid=False,
            reason=f"VAT validation error: {exc}",
        )


def _to_decimal(val: str | float | int | None) -> Decimal | None:
    if val is None:
        return None
    try:
        return Decimal(str(val))
    except Exception:
        return None


def reconcile_totals(
    subtotal_val: str | float | int | None,
    tax_val: str | float | int | None,
    total_val: str | float | int | None,
    *,
    tolerance: Decimal = Decimal("0.01"),
) -> TotalsCheck:
    subtotal = _to_decimal(subtotal_val)
    total_tax = _to_decimal(tax_val)
    actual_total = _to_decimal(total_val)

    if subtotal is None or total_tax is None or actual_total is None:
        return TotalsCheck(
            status="incomplete",
            subtotal=subtotal,
            total_tax=total_tax,
            actual_total=actual_total,
            reason="Missing one or more required financial amounts (subtotal, tax, or total)",
        )

    expected_total = subtotal + total_tax
    diff = abs(expected_total - actual_total)
    is_valid = diff <= tolerance

    reason = (
        "Totals reconciled within tolerance"
        if is_valid
        else f"Totals mismatch: expected {expected_total}, got {actual_total}"
    )

    return TotalsCheck(
        status="valid" if is_valid else "invalid",
        subtotal=subtotal,
        total_tax=total_tax,
        expected_total=expected_total,
        actual_total=actual_total,
        difference=diff,
        reason=reason,
    )


def validate_financial_document(
    document: InvoiceDocument | ReceiptDocument,
) -> FinancialValidationResult:
    vendor_vat_raw = (
        document.vendor_vat_id.value if document.vendor_vat_id else None
    )
    customer_vat_raw = (
        document.customer_vat_id.value if document.customer_vat_id else None
    )

    subtotal_raw = document.subtotal.value if document.subtotal else None
    tax_raw = document.total_tax.value if document.total_tax else None
    total_raw = document.invoice_total.value if document.invoice_total else None

    vendor_check = validate_eu_vat(vendor_vat_raw)
    customer_check = (
        validate_eu_vat(customer_vat_raw)
        if document.document_type == "invoice"
        else None
    )
    totals_check = reconcile_totals(subtotal_raw, tax_raw, total_raw)

    return FinancialValidationResult(
        vendor_vat=vendor_check,
        customer_vat=customer_check,
        totals=totals_check,
    )
