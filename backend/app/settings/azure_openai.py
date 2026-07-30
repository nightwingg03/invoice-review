from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_AZURE_OPENAI_DEPLOYMENT = "gpt-5-mini"
BACKEND_ROOT = Path(__file__).resolve().parents[2]


class AzureOpenAISettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    azure_openai_endpoint: str
    azure_openai_api_key: str
    azure_openai_deployment: str = DEFAULT_AZURE_OPENAI_DEPLOYMENT
