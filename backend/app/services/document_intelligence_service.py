from __future__ import annotations

from pathlib import Path
from typing import Any

from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import (
    AnalyzeDocumentRequest,
    AnalyzeResult,
    DocumentField,
)
from azure.core.credentials import AzureKeyCredential
from pydantic_settings import BaseSettings, SettingsConfigDict

PREBUILT_INVOICE_MODEL = "prebuilt-invoice"
PREBUILT_RECEIPT_MODEL = "prebuilt-receipt"
BACKEND_ROOT = Path(__file__).resolve().parents[2]


class DocumentIntelligenceSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    azure_document_intelligence_endpoint: str
    azure_document_intelligence_key: str


def serialize_document_field(field: DocumentField) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "type": field.type,
        "content": field.content,
        "confidence": field.confidence,
    }

    if field.value_string is not None:
        payload["value_string"] = field.value_string
    if field.value_date is not None:
        payload["value_date"] = field.value_date.isoformat()
    if field.value_number is not None:
        payload["value_number"] = field.value_number
    if field.value_currency is not None:
        payload["value_currency"] = {
            "amount": field.value_currency.amount,
            "currency_code": field.value_currency.currency_code,
        }
    if field.value_array is not None:
        payload["value_array"] = [serialize_document_field(item) for item in field.value_array]
    if field.value_object is not None:
        payload["value_object"] = {
            key: serialize_document_field(value) for key, value in field.value_object.items()
        }

    return payload


def serialize_analyze_result(result: AnalyzeResult) -> dict[str, Any]:
    documents: list[dict[str, Any]] = []
    for document in result.documents or []:
        documents.append(
            {
                "doc_type": document.doc_type,
                "confidence": document.confidence,
                "fields": {
                    name: serialize_document_field(field)
                    for name, field in (document.fields or {}).items()
                },
            }
        )

    return {
        "model_id": result.model_id,
        "documents": documents,
    }


class DocumentIntelligenceService:
    def __init__(self, settings: DocumentIntelligenceSettings | None = None) -> None:
        self._settings = settings or DocumentIntelligenceSettings()
        self._client = DocumentIntelligenceClient(
            endpoint=self._settings.azure_document_intelligence_endpoint,
            credential=AzureKeyCredential(self._settings.azure_document_intelligence_key),
        )

    def _analyze(self, model_id: str, document_path: Path) -> AnalyzeResult:
        document_bytes = document_path.read_bytes()
        poller = self._client.begin_analyze_document(
            model_id,
            AnalyzeDocumentRequest(bytes_source=document_bytes),
        )
        return poller.result()

    def analyze(self, model_id: str, document_path: Path) -> dict[str, Any]:
        return serialize_analyze_result(self._analyze(model_id, document_path))

    def analyze_invoice(self, document_path: Path) -> dict[str, Any]:
        return self.analyze(PREBUILT_INVOICE_MODEL, document_path)

    def analyze_receipt(self, document_path: Path) -> dict[str, Any]:
        return self.analyze(PREBUILT_RECEIPT_MODEL, document_path)
