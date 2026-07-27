from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.schemas.common import (
    ExtractedDate,
    ExtractedMoney,
    ExtractedString,
    LineItem,
    average_confidence,
    minimum_confidence,
)


class ReceiptDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_type: Literal["receipt"] = "receipt"
    currency: str | None = None
    vendor_name: ExtractedString | None = None
    vendor_vat_id: ExtractedString | None = None
    customer_name: ExtractedString | None = None
    customer_vat_id: ExtractedString | None = None
    invoice_number: ExtractedString | None = None
    invoice_date: ExtractedDate | None = None
    due_date: ExtractedDate | None = None
    purchase_order: ExtractedString | None = None
    subtotal: ExtractedMoney | None = None
    total_tax: ExtractedMoney | None = None
    invoice_total: ExtractedMoney | None = None
    line_items: list[LineItem] = Field(default_factory=list)

    @computed_field
    @property
    def average_confidence(self) -> float | None:
        return average_confidence(self)

    @computed_field
    @property
    def minimum_confidence(self) -> float | None:
        return minimum_confidence(self)
