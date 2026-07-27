from __future__ import annotations

from collections.abc import Callable, Iterator
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, TypeVar

from pydantic import BaseModel, ConfigDict, Field

ModelT = TypeVar("ModelT", bound=BaseModel)


class ExtractedString(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: str | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class ExtractedMoney(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: str | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class ExtractedDate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: str | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)


ExtractedField = ExtractedString | ExtractedMoney | ExtractedDate


class LineItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: ExtractedString | None = None
    quantity: ExtractedString | None = None
    unit_price: ExtractedMoney | None = None
    amount: ExtractedMoney | None = None
    product_code: ExtractedString | None = None


def format_amount(value: float | int) -> str:
    quantized = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return format(quantized, "f")


def get_field(fields: dict[str, Any], name: str) -> dict[str, Any] | None:
    field = fields.get(name)
    if isinstance(field, dict):
        return field
    return None


def read_confidence(field: dict[str, Any] | None) -> float | None:
    if field is None:
        return None
    confidence = field.get("confidence")
    if isinstance(confidence, (int, float)):
        return float(confidence)
    return None


def parse_string_field(field: dict[str, Any] | None) -> ExtractedString | None:
    if field is None:
        return None

    value_string = field.get("value_string")
    if value_string is not None:
        value = str(value_string).strip()
    else:
        content = field.get("content")
        value = str(content).strip() if content is not None else None

    confidence = read_confidence(field)
    if value is None and confidence is None:
        return None
    return ExtractedString(value=value or None, confidence=confidence)


def parse_date_field(field: dict[str, Any] | None) -> ExtractedDate | None:
    if field is None:
        return None

    value_date = field.get("value_date")
    if value_date is not None:
        value = str(value_date)
    else:
        content = field.get("content")
        value = str(content).strip() if content is not None else None

    confidence = read_confidence(field)
    if value is None and confidence is None:
        return None
    return ExtractedDate(value=value or None, confidence=confidence)


def parse_money_field(field: dict[str, Any] | None) -> ExtractedMoney | None:
    if field is None:
        return None

    value_currency = field.get("value_currency")
    if isinstance(value_currency, dict):
        amount = value_currency.get("amount")
        if amount is None:
            value = field.get("content")
            value = str(value).strip() if value is not None else None
        else:
            value = format_amount(amount)
    elif field.get("value_number") is not None:
        value = format_amount(field["value_number"])
    else:
        content = field.get("content")
        value = str(content).strip() if content is not None else None

    confidence = read_confidence(field)
    if value is None and confidence is None:
        return None
    return ExtractedMoney(value=value or None, confidence=confidence)


def parse_number_field(field: dict[str, Any] | None) -> ExtractedString | None:
    if field is None:
        return None

    if field.get("value_number") is not None:
        value = format_amount(field["value_number"])
    else:
        value_string = field.get("value_string")
        if value_string is not None:
            value = str(value_string).strip()
        else:
            content = field.get("content")
            value = str(content).strip() if content is not None else None

    confidence = read_confidence(field)
    if value is None and confidence is None:
        return None
    return ExtractedString(value=value or None, confidence=confidence)


def parse_currency_code(field: dict[str, Any] | None) -> str | None:
    if field is None:
        return None
    value_currency = field.get("value_currency")
    if not isinstance(value_currency, dict):
        return None
    currency_code = value_currency.get("currency_code")
    if currency_code is None:
        return None
    return str(currency_code)


def resolve_currency(fields: dict[str, Any], *source_names: str) -> str | None:
    for source_name in source_names:
        currency = parse_currency_code(get_field(fields, source_name))
        if currency is not None:
            return currency
    return None


def first_document_fields(analysis: dict[str, Any]) -> dict[str, Any]:
    documents = analysis.get("documents") or []
    if not documents:
        raise ValueError("Analysis payload contains no documents")
    fields = documents[0].get("fields")
    if not isinstance(fields, dict):
        return {}
    return fields


LineItemSpec = tuple[str, Callable[[dict[str, Any] | None], ExtractedField | None]]


def parse_line_items(fields: dict[str, Any], specs: dict[str, LineItemSpec]) -> list[LineItem]:
    items_field = get_field(fields, "Items")
    if items_field is None:
        return []

    raw_items = items_field.get("value_array") or []
    line_items: list[LineItem] = []
    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            continue
        item_fields = raw_item.get("value_object")
        if not isinstance(item_fields, dict):
            continue

        payload: dict[str, ExtractedField | None] = {}
        for target_name, (source_name, parser) in specs.items():
            payload[target_name] = parser(get_field(item_fields, source_name))

        line_items.append(LineItem.model_validate(payload))

    return line_items


def map_fields(
    fields: dict[str, Any],
    mapping: dict[str, str],
    parser: Callable[[dict[str, Any] | None], ExtractedField | None],
) -> dict[str, ExtractedField | None]:
    return {
        target_name: parser(get_field(fields, source_name))
        for source_name, target_name in mapping.items()
    }


MANIFEST_FIELD_NAMES: tuple[str, ...] = (
    "vendor_name",
    "vendor_vat_id",
    "customer_name",
    "customer_vat_id",
    "invoice_number",
    "invoice_date",
    "due_date",
    "purchase_order",
    "subtotal",
    "total_tax",
    "invoice_total",
)

DATE_MANIFEST_FIELDS = frozenset({"invoice_date", "due_date"})
MONEY_MANIFEST_FIELDS = frozenset({"subtotal", "total_tax", "invoice_total"})


def manifest_field(name: str, value: str | None) -> ExtractedField | None:
    if value is None:
        return None
    if name in DATE_MANIFEST_FIELDS:
        return ExtractedDate(value=value)
    if name in MONEY_MANIFEST_FIELDS:
        return ExtractedMoney(value=value)
    return ExtractedString(value=value)


def build_manifest_payload(expected: dict[str, Any], document_type: str) -> dict[str, Any]:
    payload: dict[str, Any] = {"document_type": document_type, "line_items": []}
    for field_name in MANIFEST_FIELD_NAMES:
        payload[field_name] = manifest_field(field_name, expected.get(field_name))
    payload["currency"] = expected.get("currency")
    return payload


def extracted_value(field: ExtractedField | None) -> str | None:
    if field is None:
        return None
    return field.value


def flatten_extracted_fields(
    document: BaseModel,
    field_names: tuple[str, ...],
) -> dict[str, str | None]:
    values = {"document_type": getattr(document, "document_type", None)}
    currency = getattr(document, "currency", None)
    values["currency"] = currency if isinstance(currency, str) or currency is None else None
    for field_name in field_names:
        values[field_name] = extracted_value(getattr(document, field_name, None))
    return values


def iter_confidences(value: Any) -> Iterator[float]:
    if isinstance(value, (ExtractedString, ExtractedMoney, ExtractedDate)):
        if value.confidence is not None:
            yield value.confidence
        return

    if isinstance(value, BaseModel):
        for field_name in value.model_fields:
            yield from iter_confidences(getattr(value, field_name))
        return

    if isinstance(value, list):
        for item in value:
            yield from iter_confidences(item)


def average_confidence(model: BaseModel) -> float | None:
    scores = list(iter_confidences(model))
    if not scores:
        return None
    return sum(scores) / len(scores)


def minimum_confidence(model: BaseModel) -> float | None:
    scores = list(iter_confidences(model))
    if not scores:
        return None
    return min(scores)
