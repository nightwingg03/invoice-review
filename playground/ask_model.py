"""Live Azure OpenAI playground runner."""

from __future__ import annotations

import json
import sys
from pathlib import Path

PLAYGROUND_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = PLAYGROUND_ROOT.parent / "backend"
REPO_ROOT = PLAYGROUND_ROOT.parent

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
