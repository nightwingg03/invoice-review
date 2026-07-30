from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.accounting.routes import accounting_router
from app.auth import auth_router
from app.config import APP_CONFIG
from app.database import build_database
from app.documents.models import DocumentRecord
from app.documents.routes import document_router
from app.security import SecurityHeadersMiddleware


def create_app() -> FastAPI:
    config = APP_CONFIG
    config.upload_dir.mkdir(parents=True, exist_ok=True)

    engine, session_factory = build_database(config.database_url)
    DocumentRecord.metadata.create_all(engine)

    app = FastAPI(title="Invoice Review API", version="0.1.0")
    app.add_middleware(SecurityHeadersMiddleware)
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

    app.include_router(auth_router)
    app.include_router(document_router)
    app.include_router(accounting_router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    # Mount production frontend static SPA if built
    root_dir = Path(__file__).resolve().parents[2]
    frontend_dist = root_dir / "frontend" / "dist"

    if frontend_dist.exists():
        assets_dir = frontend_dist / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=assets_dir), name="static_assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_spa(full_path: str) -> FileResponse:
            # Serve requested file if it exists, otherwise fallback to index.html
            target_file = frontend_dist / full_path
            if full_path and target_file.exists() and target_file.is_file():
                return FileResponse(target_file)
            return FileResponse(frontend_dist / "index.html")

    return app


app = create_app()
