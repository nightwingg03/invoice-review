from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.accounting.routes import accounting_router
from app.config import APP_CONFIG
from app.database import build_database
from app.documents.models import DocumentRecord
from app.documents.routes import document_router


def create_app() -> FastAPI:
    config = APP_CONFIG
    config.upload_dir.mkdir(parents=True, exist_ok=True)

    engine, session_factory = build_database(config.database_url)
    DocumentRecord.metadata.create_all(engine)

    app = FastAPI(title="Invoice Review API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[config.allowed_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.config = config
    app.state.engine = engine
    app.state.session_factory = session_factory

    app.include_router(document_router)
    app.include_router(accounting_router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
