from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.azure import AzureProvider

from app.accounting.catalog import (
    GL_ACCOUNT_DESCRIPTIONS,
    GlAccountCode,
    GlSuggestion,
)
from app.settings.azure_openai import AzureOpenAISettings

if TYPE_CHECKING:
    from app.pipeline.base import PipelineContext

__all__ = [
    "GL_ACCOUNT_DESCRIPTIONS",
    "GlAccountCode",
    "GlCategorizationStep",
    "GlSuggestion",
]


class GlCategorizationStep:
    name: str = "gl_categorization"

    SYSTEM_PROMPT = """
    You are an expert financial accountant for Northstar Facilities B.V.
    Your task is to assign the single best General Ledger (GL) account code to a
    financial expense based on normalized extracted data.

    Available GL Accounts:
    - 4000: Office Supplies & Stationery
    - 4100: Facilities & Building Maintenance
    - 4200: Utilities (Electricity, Water, Gas)
    - 4300: IT Hardware & Software Licensing
    - 4400: Fuel & Vehicle Travel Expenses
    - 4500: Meals & Client Entertainment
    - 4600: Professional Services & Legal Fees
    - 4700: Cleaning & Janitorial Services
    - 4800: Marketing & Advertising
    - 4900: Telecommunications & Internet

    Select the exact account_code matching the transaction, a confidence score
    between 0.0 and 1.0, and a concise reasoning.
    """

    def __init__(self, settings: AzureOpenAISettings | None = None) -> None:
        self._settings = settings or AzureOpenAISettings()
        self._agent = self._create_agent()

    def run(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.extraction is None:
            raise ValueError(
                "Extraction step must be run before GlCategorizationStep"
            )

        doc = ctx.extraction
        vendor = (
            doc.vendor_name.value if doc.vendor_name else "Unknown Vendor"
        )
        subtotal = doc.subtotal.value if doc.subtotal else "N/A"
        total_tax = doc.total_tax.value if doc.total_tax else "N/A"
        total = doc.invoice_total.value if doc.invoice_total else "N/A"
        currency = doc.currency or "EUR"

        line_items_desc = [
            item.description.value
            for item in doc.line_items
            if item.description and item.description.value
        ]

        prompt = (
            f"Classify the General Ledger (GL) account for this expense:\n"
            f"- Document Type: {doc.document_type}\n"
            f"- Vendor/Merchant: {vendor}\n"
            f"- Amounts: Subtotal={subtotal}, Tax={total_tax},"
            f" Total={total} {currency}\n"
            f"- Line Items: {', '.join(line_items_desc) if line_items_desc else 'None'}\n"
        )

        print("  -> GL Categorization: Suggesting GL Account using LLM...")
        suggestion = self._run_agent(prompt)
        account_title = GL_ACCOUNT_DESCRIPTIONS.get(
            suggestion.account_code, ""
        )
        print(
            f"  -> GL Categorization: Suggested Account {suggestion.account_code.value}"
            f" ({account_title}) [Confidence: {suggestion.confidence:.2f}]"
        )

        return ctx.model_copy(update={"gl_suggestion": suggestion})

    def _run_agent(self, prompt: str) -> GlSuggestion:
        import asyncio

        import nest_asyncio

        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                nest_asyncio.apply(loop)
        except RuntimeError:
            pass

        result = self._agent.run_sync(prompt)
        return result.output

    def _create_agent(self) -> Agent[None, GlSuggestion]:
        model = OpenAIResponsesModel(
            self._settings.azure_openai_deployment,
            provider=AzureProvider(
                azure_endpoint=self._settings.azure_openai_endpoint.rstrip("/"),
                api_key=self._settings.azure_openai_api_key,
            ),
        )
        return Agent(
            model,
            output_type=GlSuggestion,
            system_prompt=self.SYSTEM_PROMPT,
        )
