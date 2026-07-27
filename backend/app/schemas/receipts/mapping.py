from __future__ import annotations

from typing import Any

from app.schemas.common import (
    MANIFEST_FIELD_NAMES,
    build_manifest_payload,
    first_document_fields,
    flatten_extracted_fields,
    map_fields,
    parse_date_field,
    parse_line_items,
    parse_money_field,
    parse_number_field,
    parse_string_field,
    resolve_currency,
)
from app.schemas.receipts.models import ReceiptDocument

RECEIPT_STRING_FIELDS: dict[str, str] = {
    "MerchantName": "vendor_name",
}

RECEIPT_DATE_FIELDS: dict[str, str] = {
    "TransactionDate": "invoice_date",
}

RECEIPT_MONEY_FIELDS: dict[str, str] = {
    "Subtotal": "subtotal",
    "TotalTax": "total_tax",
    "Total": "invoice_total",
}

RECEIPT_LINE_ITEM_SPECS = {
    "description": ("Description", parse_string_field),
    "quantity": ("Quantity", parse_number_field),
    "unit_price": ("Price", parse_money_field),
    "amount": ("TotalPrice", parse_money_field),
    "product_code": ("ProductCode", parse_string_field),
}

RECEIPT_DEFAULTS: dict[str, None] = {
    "vendor_vat_id": None,
    "customer_name": None,
    "customer_vat_id": None,
    "invoice_number": None,
    "due_date": None,
    "purchase_order": None,
}


def from_analysis(analysis: dict[str, Any]) -> ReceiptDocument:
    fields = first_document_fields(analysis)
    payload: dict[str, Any] = {"document_type": "receipt", **RECEIPT_DEFAULTS}
    payload.update(map_fields(fields, RECEIPT_STRING_FIELDS, parse_string_field))
    payload.update(map_fields(fields, RECEIPT_DATE_FIELDS, parse_date_field))
    payload.update(map_fields(fields, RECEIPT_MONEY_FIELDS, parse_money_field))
    payload["currency"] = resolve_currency(fields, "Total", "Subtotal")
    payload["line_items"] = parse_line_items(fields, RECEIPT_LINE_ITEM_SPECS)
    return ReceiptDocument.model_validate(payload)


def from_manifest(expected: dict[str, Any]) -> ReceiptDocument:
    return ReceiptDocument.model_validate(build_manifest_payload(expected, "receipt"))


def field_values(document: ReceiptDocument) -> dict[str, str | None]:
    return flatten_extracted_fields(document, MANIFEST_FIELD_NAMES)
