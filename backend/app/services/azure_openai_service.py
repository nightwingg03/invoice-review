from __future__ import annotations

from pathlib import Path

from openai import OpenAI
from openai.types.responses import Response
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_DEPLOYMENT = "gpt-5-mini"
BACKEND_ROOT = Path(__file__).resolve().parents[2]


class AzureOpenAISettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    azure_openai_endpoint: str
    azure_openai_api_key: str


class AzureOpenAIService:
    deployment = DEFAULT_DEPLOYMENT

    def __init__(self, settings: AzureOpenAISettings | None = None) -> None:
        self._settings = settings or AzureOpenAISettings()
        self._client = OpenAI(
            base_url=self._settings.azure_openai_endpoint.rstrip("/"),
            api_key=self._settings.azure_openai_api_key,
        )

    def complete(self, prompt: str, *, deployment: str | None = None) -> Response:
        return self._client.responses.create(
            model=deployment or self.deployment,
            input=prompt,
        )

    @staticmethod
    def response_text(response: Response) -> str:
        parts: list[str] = []
        for item in response.output:
            if item.type != "message":
                continue
            for content in item.content:
                if content.type == "output_text":
                    parts.append(content.text)
        if parts:
            return "\n".join(parts)
        return str(response.output)
