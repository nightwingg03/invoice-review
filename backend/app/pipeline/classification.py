from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic_ai import Agent, BinaryContent
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.azure import AzureProvider

from app.settings.azure_openai import AzureOpenAISettings


class DocumentClassification(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_type: Literal["invoice", "receipt"]
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str = Field(min_length=1)


class ClassificationStep:
    PROMPT = "Classify this financial document as invoice or receipt based on its layout and content."
    SYSTEM_PROMPT = (
        """
        You classify financial documents for a finance team.
        Choose invoice when the document is a supplier bill requesting payment. Invoices usually include an invoice number, supplier
        customer details, VAT IDs, line items , totals , and often a due date or payment terms.

        Choose receipt when the document records an expense that was already paid. Receipts usually show a merchant, transaction date , payment
        total , and sometimes VAT , but not invoice numbers, customer VAT IDs, purchase orders , or payment terms

        Return your best label, a confidence between 0 and 1 , and a brief reason.
        """
    )
    MEDIA_TYPES = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }

    def __init__(self, settings: AzureOpenAISettings | None = None) -> None:
        self._settings = settings or AzureOpenAISettings()
        self._agent = self._create_agent()

    def run(self, document_path: Path | str) -> DocumentClassification:
        path = Path(document_path)
        result = self._agent.run_sync(
            [
                self.PROMPT,
                BinaryContent(
                    data=path.read_bytes(),
                    media_type=self._media_type(path),
                ),
            ],
        )
        return result.output

    def _create_agent(self) -> Agent[None, DocumentClassification]:
        model = OpenAIResponsesModel(
            self._settings.azure_openai_deployment,
            provider=AzureProvider(
                azure_endpoint=self._settings.azure_openai_endpoint.rstrip("/"),
                api_key=self._settings.azure_openai_api_key,
            ),
        )
        return Agent(
            model,
            output_type=DocumentClassification,
            system_prompt=self.SYSTEM_PROMPT,
        )

    def _media_type(self, path: Path) -> str:
        media_type = self.MEDIA_TYPES.get(path.suffix.lower())
        if media_type is None:
            supported = ", ".join(sorted(self.MEDIA_TYPES))
            msg = f"Unsupported document type {path.suffix!r}. Supported: {supported}"
            raise ValueError(msg)
        return media_type
