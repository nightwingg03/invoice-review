"""Live document classification playground runner."""

from __future__ import annotations

import json
import sys
from pathlib import Path

SUPPORTED_SUFFIXES = {".pdf", ".png", ".jpg", ".jpeg"}


def _playground_root() -> Path:
    file_path = globals().get("__file__")
    if file_path is not None:
        return Path(file_path).resolve().parent

    for candidate in (Path.cwd(), Path.cwd() / "playground", Path.cwd().parent / "playground"):
        if (candidate / "classify_document.py").is_file():
            return candidate.resolve()

    return Path.cwd().resolve()


PLAYGROUND_ROOT = _playground_root()
BACKEND_ROOT = PLAYGROUND_ROOT.parent / "backend"
REPO_ROOT = PLAYGROUND_ROOT.parent
SAMPLES_DIR = REPO_ROOT / "samples"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.pipeline.classification import ClassificationStep  # noqa: E402
from app.settings.azure_openai import AzureOpenAISettings  # noqa: E402

DEFAULT_SAMPLES = (
    SAMPLES_DIR / "generated" / "01-en-happy-classic.pdf",
    SAMPLES_DIR / "sample-invoice.pdf",
)


def _cli_document_arg() -> str | None:
    for arg in sys.argv[1:]:
        stripped = arg.strip()
        if not stripped or stripped.startswith("-"):
            continue
        if Path(stripped).suffix.lower() in SUPPORTED_SUFFIXES:
            return stripped
        if Path(stripped).is_file():
            return stripped
    return None


def resolve_document_path(document_path: Path | str | None = None) -> Path:
    if document_path is not None:
        candidate = Path(document_path).expanduser()
        if candidate.is_file():
            return candidate.resolve()

        search_roots = (
            Path.cwd(),
            PLAYGROUND_ROOT,
            REPO_ROOT,
            SAMPLES_DIR,
            SAMPLES_DIR / "generated",
        )
        for root in search_roots:
            resolved = (root / candidate).resolve()
            if resolved.is_file():
                return resolved

        msg = f"Document not found: {document_path}"
        raise FileNotFoundError(msg)

    for default in DEFAULT_SAMPLES:
        if default.is_file():
            return default

    msg = (
        "No sample document found. Pass a path explicitly, for example:\n"
        f"  run(r'{DEFAULT_SAMPLES[0].as_posix()}')\n"
        "Or ensure one of these exists:\n"
        + "\n".join(f"  - {path.as_posix()}" for path in DEFAULT_SAMPLES)
    )
    raise FileNotFoundError(msg)


def run(document_path: Path | str | None = None) -> dict[str, object]:
    resolved_path = resolve_document_path(document_path)
    settings = AzureOpenAISettings()

    print(f"Deployment: {settings.azure_openai_deployment}")
    print(f"Document: {resolved_path}")

    step = ClassificationStep(settings=settings)
    classification = step.run(resolved_path)
    payload = classification.model_dump(mode="json")
    print(json.dumps(payload, indent=2))
    return payload


def main() -> None:
    run(_cli_document_arg())


if __name__ == "__main__":
    main()
