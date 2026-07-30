from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]


class AppConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = f"sqlite:///{BACKEND_ROOT / 'data' / 'documents.db'}"
    upload_dir: Path = BACKEND_ROOT / "data" / "uploads"
    allowed_origin: str = "http://localhost:5173"


APP_CONFIG = AppConfig()
