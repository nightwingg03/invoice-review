from __future__ import annotations

from openai import OpenAI
from openai.types.responses import Response

from app.settings.azure_openai import AzureOpenAISettings


class AzureOpenAIService:
    def __init__(self, settings: AzureOpenAISettings | None = None) -> None:
        self._settings = settings or AzureOpenAISettings()
        self._client = OpenAI(
            base_url=self._settings.azure_openai_endpoint.rstrip("/"),
            api_key=self._settings.azure_openai_api_key,
        )

    @property
    def deployment(self) -> str:
        return self._settings.azure_openai_deployment

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
