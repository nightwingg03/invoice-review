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
from app.schemas.invoices.models import InvoiceDocument

INVOICE_STRING_FIELDS: dict[str, str] = {
    "VendorName": "vendor_name",
    "VendorTaxId": "vendor_vat_id",
    "CustomerName": "customer_name",
    "CustomerTaxId": "customer_vat_id",
    "InvoiceId": "invoice_number",
    "PurchaseOrder": "purchase_order",
}

INVOICE_DATE_FIELDS: dict[str, str] = {
    "InvoiceDate": "invoice_date",
    "DueDate": "due_date",
}

INVOICE_MONEY_FIELDS: dict[str, str] = {
    "SubTotal": "subtotal",
    "TotalTax": "total_tax",
    "InvoiceTotal": "invoice_total",
}

INVOICE_LINE_ITEM_SPECS = {
    "description": ("Description", parse_string_field),
    "quantity": ("Quantity", parse_number_field),
    "unit_price": ("UnitPrice", parse_money_field),
    "amount": ("Amount", parse_money_field),
    "product_code": ("ProductCode", parse_string_field),
}


def from_analysis(analysis: dict[str, Any]) -> InvoiceDocument:
    fields = first_document_fields(analysis)
    payload: dict[str, Any] = {"document_type": "invoice"}
    payload.update(map_fields(fields, INVOICE_STRING_FIELDS, parse_string_field))
    payload.update(map_fields(fields, INVOICE_DATE_FIELDS, parse_date_field))
    payload.update(map_fields(fields, INVOICE_MONEY_FIELDS, parse_money_field))
    payload["currency"] = resolve_currency(fields, "InvoiceTotal", "SubTotal")
    payload["line_items"] = parse_line_items(fields, INVOICE_LINE_ITEM_SPECS)
    return InvoiceDocument.model_validate(payload)


def from_manifest(expected: dict[str, Any]) -> InvoiceDocument:
    return InvoiceDocument.model_validate(build_manifest_payload(expected, "invoice"))


def field_values(document: InvoiceDocument) -> dict[str, str | None]:
    return flatten_extracted_fields(document, MANIFEST_FIELD_NAMES)
