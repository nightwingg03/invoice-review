"""Quick Azure OpenAI smoke test using backend/.env settings."""

from __future__ import annotations

from app.services.azure_openai_service import AzureOpenAIService

DEFAULT_PROMPT = "What is the capital of France?"


def main() -> None:
    service = AzureOpenAIService()
    response = service.complete(DEFAULT_PROMPT)
    answer = AzureOpenAIService.response_text(response)
    print(f"answer: {answer}")


if __name__ == "__main__":
    main()
