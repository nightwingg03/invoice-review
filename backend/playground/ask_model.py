"""Live Azure OpenAI playground runner."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def resolve_backend_root() -> Path:
    if "__file__" in globals():
        return Path(__file__).resolve().parents[1]

    for candidate in (Path.cwd(), Path.cwd().parent, Path.cwd() / "backend"):
        if (candidate / "app").is_dir():
            return candidate.resolve()

    msg = "Could not find backend root. cd to backend/ or run this file as a script."
    raise RuntimeError(msg)


BACKEND_ROOT = resolve_backend_root()
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.azure_openai_service import AzureOpenAIService  # noqa: E402

DEFAULT_PROMPT = "What is the capital of France?"


def run(prompt: str | None = None) -> str:
    chosen_prompt = prompt or DEFAULT_PROMPT
    service = AzureOpenAIService()

    print(f"Deployment: {service.deployment}")
    print(f"Prompt: {chosen_prompt}")

    response = service.complete(chosen_prompt)
    answer = AzureOpenAIService.response_text(response)

    print(json.dumps({"answer": answer}, indent=2))
    return answer


def main() -> None:
    prompt = " ".join(sys.argv[1:]).strip() or None
    run(prompt)


if __name__ == "__main__":
    main()
