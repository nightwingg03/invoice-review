"""Live document pipeline runner (Classify -> Extract -> Validate)."""


import json
import sys
from pathlib import Path


def _playground_root() -> Path:
    file_path = globals().get("__file__")
    if file_path is not None:
        return Path(file_path).resolve().parent

    for candidate in (
        Path.cwd(),
        Path.cwd() / "playground",
        Path.cwd().parent / "playground",
    ):
        if (candidate / "run_pipeline.py").is_file():
            return candidate.resolve()

    return Path.cwd().resolve()


PLAYGROUND_ROOT = _playground_root()
REPO_ROOT = PLAYGROUND_ROOT.parent
BACKEND_ROOT = REPO_ROOT / "backend"
SAMPLES_DIR = REPO_ROOT / "samples"

sys.path.append(str(BACKEND_ROOT))

from app.pipeline import build_default_pipeline  # noqa: E402

DEFAULT_INVOICE_SAMPLE = SAMPLES_DIR / "generated" / "01-en-happy-classic.pdf"
DEFAULT_RECEIPT_SAMPLE = SAMPLES_DIR / "generated" / "13-nl-fuel-receipt.png"
FALLBACK_SAMPLE = SAMPLES_DIR / "sample-invoice.pdf"


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

    for arg in sys.argv[1:]:
        stripped = arg.strip()
        if not stripped or stripped.startswith("-"):
            continue
        candidate = Path(stripped).expanduser()
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

    for default in (DEFAULT_INVOICE_SAMPLE, DEFAULT_RECEIPT_SAMPLE, FALLBACK_SAMPLE):
        if default.is_file():
            return default

    msg = "No sample document found to run pipeline."
    raise FileNotFoundError(msg)


def run(document_path: Path | str | None = None) -> dict[str, object]:
    path = resolve_document_path(document_path)
    print(f"Running pipeline on: {path}")

    pipeline = build_default_pipeline()
    context = pipeline.run(path)

    summary = context.to_summary_dict()
    print(json.dumps(summary, indent=2))
    return summary


def main() -> None:
    run()


if __name__ == "__main__":
    main()
