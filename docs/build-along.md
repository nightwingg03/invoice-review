# Build-along guide

The complete guided build lives at <https://learn.datalumina.com/docs/invoice-review>. This local guide records the first checkpoint represented by the `main` branch.

## Starter outcome

The repository installs reproducibly, starts a minimal FastAPI service and React interface, and includes the business brief plus fictional source documents.

## Why this boundary exists

The starter removes the completed workflow while preserving every prerequisite needed to build it. You begin with the user, the source documents, and explicit service boundaries instead of reverse-engineering a finished application.

## Commands

```bash
cd backend
uv sync --locked

cd ../frontend
pnpm install --frozen-lockfile

cd ..
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
./scripts/dev.sh --check
./scripts/dev.sh
```

## Important locations

- `docs/client-brief.md`: the recurring finance problem and definition of done
- `docs/architecture.md`: the intended boundaries and data flow
- `samples/`: the fictional evaluation corpus and manifest
- `backend/app/main.py`: the initial API boundary
- `frontend/src/App.tsx`: the initial interface boundary

## What you should observe

- `GET http://localhost:8000/health` returns `{"status":"ok"}`.
- `http://localhost:5173` shows the Invoice Review starter screen.
- No Azure request occurs at this checkpoint.

## Checkpoint

- [ ] Locked backend and frontend installs succeed.
- [ ] Backend lint passes.
- [ ] Frontend type-check, lint, and production build pass.
- [ ] `./scripts/dev.sh --check` reports that Invoice Review is ready to start.
- [ ] The health endpoint and starter screen load locally.

Continue with the [online tutorial](https://learn.datalumina.com/docs/invoice-review).

## Document Intelligence invoice check

### Outcome

A minimal backend service sends a local invoice PDF to Azure Document Intelligence `prebuilt-invoice`, then prints normalized fields plus raw provider output.

### Why

This is the first live Azure slice. It proves endpoint/key configuration, SDK wiring, and invoice field extraction before the full review workflow exists.

### Commands

```bash
cd backend
uv sync --locked

curl -L \
  https://raw.githubusercontent.com/Azure-Samples/cognitive-services-REST-api-samples/master/curl/form-recognizer/sample-invoice.pdf \
  -o ../samples/sample-invoice.pdf

cd playground
uv run --directory .. --locked --no-sync python -m playground.analyze_invoice
uv run --directory .. --locked --no-sync python -m playground.analyze_invoice 01-en-happy-classic.pdf
```

### Observable result

- `playground/analyze_invoice.py` prints JSON with `model_id`, extracted invoice fields, and `normalized_fields` aligned to the project manifest names.
- A successful run against the Microsoft sample includes values such as `vendor_name`, `invoice_number`, `invoice_total`, and `currency`.

### Checkpoint

- [ ] `backend/.env` contains `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` and `AZURE_DOCUMENT_INTELLIGENCE_KEY`.
- [ ] `uv run --locked --no-sync ruff check app playground` passes from `backend/`.
- [ ] `uv run --directory .. --locked --no-sync python -m playground.analyze_invoice` completes from `backend/playground/`.

## Pydantic schemas for Document Intelligence

### Outcome

Invoice and receipt extraction now maps into typed Pydantic models under `app/schemas/`, aligned with `samples/manifest.json`. The DI service serializes Azure SDK output to plain dicts; mapping reads those dicts through parsers in `common.py` and builds domain models with confidence scores and line items.

### Why

Downstream rules, persistence, and UI need a stable domain shape instead of raw Azure field dictionaries. One shared normalized model covers both invoices and receipts.

### Commands

```bash
cd backend
uv run --locked --no-sync ruff check app playground
uv run --locked --no-sync python -m playground.map_documents
uv run --locked --no-sync python -m playground.analyze_invoice
```

### Observable result

- `playground/map_documents.py` validates manifest fixtures for `01-en-happy-classic.pdf` and `13-nl-fuel-receipt.png`, then maps a live invoice from `samples/sample-invoice.pdf` into `InvoiceDocument`.
- `InvoiceDocument` and `ReceiptDocument` expose manifest field names such as `vendor_name`, `invoice_total`, and `currency`.
- Live receipt mapping runs when `samples/13-nl-fuel-receipt.png` is present; otherwise the script prints a skip message.

### Checkpoint

- [ ] `app/schemas/invoices/` and `app/schemas/receipts/` contain models and Azure mappers.
- [ ] `DocumentIntelligenceService` exposes `analyze`, `analyze_invoice`, and `analyze_receipt` without field normalization.
- [ ] `uv run --locked --no-sync python -m playground.map_documents` prints fixture JSON and a live invoice model.

## Azure OpenAI smoke test

### Outcome

A minimal Azure OpenAI service sends a prompt to the deployed Foundry model through the Responses API and prints the answer text.

### Why

This proves endpoint, deployment, and key configuration before the build wires document review and GL suggestion onto the same client.

### Commands

```bash
cd backend
uv run --locked --no-sync python test.py
uv run --locked --no-sync python -m playground.ask_model
uv run --locked --no-sync python -m playground.ask_model What is the capital of the Netherlands?
```

### Observable result

- `test.py` and `playground/ask_model.py` print a plain-text answer such as `Paris.` for the default France prompt.
- Settings load from `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY` in `backend/.env`.
- The service uses the hardcoded deployment name `gpt-5-mini`.

### Checkpoint

- [ ] `backend/.env` contains `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY`.
- [ ] `uv run --locked --no-sync ruff check app playground test.py` passes.
- [ ] `uv run --locked --no-sync python test.py` returns a model answer.
