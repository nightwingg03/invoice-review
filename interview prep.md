# Interview Prep — E2E Intelligent Invoice & Receipt Review

Use this as a cheat sheet for **Northstar Facilities B.V.** (demo client): upload → AI pipeline → human review → approve/reject.

**Live demo:** [Azure Container Apps URL](https://app-invoice-review.redcoast-d7dfd6c7.centralindia.azurecontainerapps.io/)

---

## 30-Second Elevator Pitch

> “I built an end-to-end invoice and receipt review app: users upload PDFs or images, a four-step pipeline classifies the doc, extracts fields with Azure Document Intelligence, runs deterministic EU VAT and math checks, suggests a GL account with Azure OpenAI, and reviewers correct, override GL, approve/reject, or draft a supplier email. It’s one Docker image on Azure Container Apps with SQLite and uploads on Azure Files, scale-to-zero for cost.”

---

## What Problem Does It Solve?

| Pain | How we address it |
|------|-------------------|
| Manual data entry from invoices/receipts | Azure DI `prebuilt-invoice` / `prebuilt-receipt` |
| Wrong VAT or totals | `python-stdnum` EU VAT + subtotal + tax = total (€0.01 tolerance) |
| Duplicate invoices | Indexed `vendor_name` + `invoice_number` lookup |
| GL coding is slow/subjective | LLM suggests account from Northstar catalog; human can override |
| Supplier back-and-forth | One-click correction email from validation issues |

---

## High-Level Architecture

```
Browser (React SPA)
       │
       ▼  same origin in prod: /api/*
┌──────────────────────────────────────┐
│  Single container (uvicorn :8000)   │
│  • FastAPI REST                       │
│  • Static files: frontend/dist        │
│  • SQLite + uploads → /app/backend/data│  ◄── Azure Files mount
└──────────┬───────────────┬────────────┘
           │               │
           ▼               ▼
   Azure Document      Azure OpenAI
   Intelligence        (classification + GL;
   (extraction)        vision on raw bytes for classify)
```

**Pattern:** Modular monolith in one container — not microservices. Good for demos and low traffic; trade-offs below.

---

## The 4-Step Pipeline

| Step | Tech | Input → Output |
|------|------|----------------|
| **1. Classify** | Azure OpenAI + **pydantic-ai** (image/PDF bytes) | `invoice` \| `receipt` + confidence + rationale |
| **2. Extract** | Azure Document Intelligence | `InvoiceDocument` or `ReceiptDocument` (Pydantic, per-field confidence) |
| **3. Validate** | Pure Python (`stdnum`, `Decimal`) | VAT checks, totals reconciliation, findings list |
| **4. Suggest GL** | Azure OpenAI + pydantic-ai | `GlSuggestion`: account code, confidence, reasoning |

**Orchestration:** `Pipeline` runs `PipelineStep` implementations in order; shared state in `PipelineContext`.

**After pipeline:** `DocumentService` persists JSON for each stage on `DocumentRecord`, runs duplicate detection, sets `status` to `processed` or `failed`.

**Async note:** Upload handler runs the sync pipeline in `run_in_executor` so pydantic-ai / nest_asyncio does not fight FastAPI’s event loop.

---

## Tech Stack (Memorize This Table)

| Layer | Choices | Why |
|-------|---------|-----|
| **API** | Python 3.10, FastAPI, Pydantic v2 | Fast to build, automatic OpenAPI, strict schemas |
| **ORM / DB** | SQLAlchemy 2, SQLite | Zero ops DB for demo; file lives on persistent volume in Azure |
| **Deps** | `uv` + lockfile | Fast installs in Docker |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind 4, React Router 7 | Modern SPA; `pnpm` locally |
| **AI — docs** | Azure AI Document Intelligence | Prebuilt models, confidence per field |
| **AI — LLM** | Azure OpenAI (e.g. `gpt-5-mini` in `.env.example`) | Classification + GL; structured output via pydantic-ai |
| **Cloud** | ACA, ACR, Azure Files, `centralindia` | Consumption, scale to 0, cheap idle |
| **Container** | Multi-stage Dockerfile: Node build → Python slim | One deployable artifact |

---

## Data Models (Backend)

### Persistence: `DocumentRecord` (SQLAlchemy)

- **Identity:** `id` (UUID), `filename`, `file_path`, `status`, `document_type`
- **Pipeline JSON (Text):** `classification`, `extraction`, `validation`, `gl_suggestion`
- **Review:** `review_data`, `issues` (e.g. duplicate warning)
- **Indexed for duplicates:** `vendor_name`, `invoice_number` (normalized lowercase)
- **Timestamps:** `created_at`, `updated_at`

### Domain: extracted documents (Pydantic)

- **`InvoiceDocument` / `ReceiptDocument`** — fields wrapped as `ExtractedString`, `ExtractedMoney`, `ExtractedDate` with optional **confidence** from DI.
- **Validation:** `FinancialValidationResult` → `VatCheck`, `TotalsCheck`

### API shapes

- Frontend types in `frontend/src/lib/types.ts` should mirror `backend/app/documents/schemas.py`.

---

## Frontend (What to Say)

- **Routes:** `/login`, `/` (hero/upload), `/processing`, `/results/:id`, `/review`, `/history`, `/documents/:id`
- **Auth:** `AuthContext` + `ProtectedRoute`; token from `POST /api/auth/login`, stored client-side, `Bearer` on API calls
- **Rule:** All HTTP via `src/lib/api.ts` — no raw `fetch` in components
- **API base:** `VITE_API_BASE_URL` — `http://localhost:8000` in dev, `/` in Docker (same origin, no CORS pain in prod)

**UX features:** edit fields, GL dropdown override, approve/reject bar, correction email modal, history + delete.

---

## API Endpoints (Quick List)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness |
| POST | `/api/auth/login` | Password → SHA-256-derived token |
| GET | `/api/auth/verify` | Check Bearer token |
| POST | `/api/documents` | Upload + full pipeline (rate limited) |
| GET | `/api/documents` | List reviews |
| GET | `/api/documents/{id}` | Detail |
| GET | `/api/documents/{id}/file` | Original PDF/image |
| PUT | `/api/documents/{id}` | Field corrections → `review_data` |
| PUT | `/api/documents/{id}/accounting` | GL override |
| POST | `/api/documents/{id}/decision` | `approved` / `rejected` |
| POST | `/api/documents/{id}/correction-email` | Supplier email draft |
| DELETE | `/api/documents/{id}` | Delete record + file |
| GET | accounting routes | GL catalog (see `accounting/routes.py`) |

---

## Security (Likely Deep-Dive)

| Control | Implementation |
|---------|----------------|
| **Workspace lock** | Shared `APP_PASSWORD` env; token = `sha256("invoice-review-salt:" + password)` |
| **Upload types** | PDF, JPEG, PNG only; max **4 MB** |
| **Magic bytes** | Reject MIME spoofing (`%PDF-`, JPEG, PNG signatures) |
| **Path traversal** | `Path(filename).name`; resolved path must stay under `upload_dir` |
| **Rate limit** | In-memory sliding window: **5 uploads / 5 min / IP** (`X-Forwarded-For` aware) |
| **Headers** | `X-Content-Type-Options`, `X-Frame-Options`, etc. |
| **SQL injection** | SQLAlchemy ORM only — parameterized queries |

**Honest weaknesses (good to volunteer):**

- Password auth is demo-grade, not SSO/RBAC.
- Rate limit is per-process memory — resets on scale-out or cold start; not Redis.
- Secrets in Container App env vars — production would use Key Vault + managed identity.
- No encryption-at-rest story beyond Azure platform defaults.

---

## Azure Deployment

| Resource | Role |
|----------|------|
| **ACR** (`acrinvoicereviewharsh`) | Store `invoice-review:v1` image |
| **Storage + File share** (`stinvrevharsh` / `share-invoice-review`) | Persist `documents.db` + `uploads/` |
| **Container Apps Environment** | Consumption |
| **Container App** (`app-invoice-review`) | 0.25 vCPU, 0.5 GiB, **min replicas 0**, port 8000 |
| **Azure DI** (`di-invoice-review-harsh`) | Extraction |
| **Azure OpenAI / Foundry** (`rg-invoice-review-harsh-foundry`) | LLM |

**Mount:** share → `/app/backend/data` inside container.

**Build:** `az acr build` runs Dockerfile (frontend `npm run build` with `VITE_API_BASE_URL=/`, then `uv sync` backend).

**Region:** `centralindia` — mention latency vs EU users if asked.

---

## Pros & Cons of Key Choices

### Single container (FastAPI + static SPA)

| Pros | Cons |
|------|------|
| No CORS in production | Can't scale UI and API independently |
| One image, simple CI/CD | Large image (Node build + Python) |
| Easy local parity with prod routing | SPA catch-all route must not shadow `/api` |

### SQLite on Azure Files

| Pros | Cons |
|------|------|
| No separate DB server cost | SQLite on network share: locking/latency limits |
| Survives scale-to-zero | Not ideal for high concurrent writes |
| Perfect for demo / low volume | Would migrate to PostgreSQL for production |

### Azure Document Intelligence vs “LLM-only” extraction

| Pros | Cons |
|------|------|
| Structured fields + confidence | Cost per page; model limits on layout |
| Prebuilt invoice/receipt | Less flexible than custom trained model |
| Deterministic mapping to Pydantic | Weak on very messy scans |

### Azure OpenAI for classify + GL (not for all extraction)

| Pros | Cons |
|------|------|
| Vision understands layout when classifying | Token cost; latency |
| Structured output (`DocumentClassification`, `GlSuggestion`) | Needs guardrails; GL must stay in allowed enum |
| Keeps validation **deterministic** separate from LLM | Model can still misclassify rare doc types |

### pydantic-ai agents

| Pros | Cons |
|------|------|
| Typed outputs, system prompts | `nest_asyncio` / executor workarounds for sync pipeline |
| Azure provider integration | Another abstraction to explain in interviews |

### Scale-to-zero ACA

| Pros | Cons |
|------|------|
| ~€0 when idle | Cold start on first request |
| Fine for interview demo | Bad for SLA-sensitive production |

---

## Design Decisions Interviewers Love

1. **Separation of concerns:** Azure SDK calls in pipeline steps; business rules in pure functions (`validate_financial_document`).
2. **No provider leak:** DI response → map to domain models before validation/review.
3. **Human-in-the-loop:** AI suggests; human approves — important for finance compliance narrative.
4. **Layered backend:** Routes (HTTP) → Service (orchestration) → Repository (DB) → Pipeline (AI).
5. **Field-level confidence:** Review UI can highlight low-confidence extractions (from DI).

---

## Likely Questions & Short Answers

### “Walk me through upload to approve.”

User uploads file → service validates type/size/magic bytes → saves file + DB row `pending` → pipeline: classify → extract with correct prebuilt model → validate VAT/totals → GL suggestion → persist JSON columns → duplicate check → `processed` → reviewer opens UI → edits/GL/decision → `approved` or `rejected`.

### “Why classify before extract?”

Different DI models (`prebuilt-invoice` vs `prebuilt-receipt`) expect different schemas. Wrong model = wrong fields.

### “Why not use the LLM for validation?”

VAT checksums and arithmetic must be **exact and auditable**. LLMs hallucinate; `stdnum` and `Decimal` do not.

### “How do duplicates work?”

After extraction, normalize vendor name and invoice number (lowercase strip). Query DB for another row with same pair, excluding current id. Append issue string; does not auto-reject.

### “What if the pipeline throws?”

Catch in service → `status=failed`, `issues` contains error message; HTTP still returns 201 with failed record (check actual behavior: yes, record is saved as failed).

### “How would you productionize?”

PostgreSQL (or Azure SQL), Key Vault, App Insights, Redis rate limit, Azure AD auth, private endpoints for OpenAI/DI, job queue for long OCR, multi-replica with shared blob storage instead of SQLite-on-files, retries/circuit breakers on Azure APIs, integration tests on golden PDFs in `samples/`.

### “Why FastAPI over Django/Node?”

FastAPI + Pydantic matches document/validation modeling; async upload endpoint; small surface area for a focused API.

### “Why React?”

Rich review UI, client routing, typed contract with backend; team familiarity.

### “Explain the Dockerfile.”

Stage 1: Node builds SPA with API base `/`. Stage 2: Python slim, `uv sync`, copy backend + `frontend/dist`, run uvicorn on 8000.

### “What’s on the persistent volume?”

`backend/data/documents.db` (default path from config) and `backend/data/uploads/`.

### “CORS?”

Dev: frontend on 5173, API on 8000 → `allowed_origin` in config. Prod: same host → effectively no cross-origin for API.

### “What models/deployments?”

DI: `prebuilt-invoice`, `prebuilt-receipt`. OpenAI: deployment name from env (example `gpt-5-mini`). Classification sends **binary document** to the model; extraction does **not** use OpenAI in current code path.

### “README mentions hybrid extraction — is that in prod?”

Marketing/docs reference dual-track DI + vision merge; **shipped pipeline** uses DI for extraction and OpenAI for classification + GL. Hybrid evaluation exists in scripts/playground for experiments — say you’d merge on conflict with provenance if you extend it.

### “How do you test?”

`ruff check` backend; `tsc -b` + `pnpm build` frontend; playground scripts run pipeline on sample PDFs; optional eval manifest against live Azure.

### “Northstar / GL accounts?”

Fictional Amsterdam facilities company; catalog codes 4000–4900 (office, utilities, fuel, etc.). LLM must pick one enum; reviewer can override via API.

### “EU VAT specifics?”

Uses `stdnum.eu.vat` for format/checksum; customer VAT checked on invoices only; extracts country from first two letters when alpha.

### “Totals validation?”

`subtotal + total_tax` vs `invoice_total` within **0.01**; missing fields → `incomplete` status.

---

## Trade-Off Scenarios (“What would you change if…?”)

| Scenario | Answer |
|----------|--------|
| **10k invoices/day** | Queue workers, blob storage, PostgreSQL, batch DI, drop scale-to-zero |
| **Multi-tenant** | Tenant id on rows, separate storage prefixes, per-tenant Azure keys |
| **Strict audit** | Immutable event log, who changed what, no delete — only archive |
| **Offline / air-gapped** | Local OCR model; no cloud — major redesign |
| **Cheaper demo** | Cache DI results, smaller pages, classify with heuristics first |

---

## Commands to Remember

```bash
# Local full stack (root)
npm run dev

# Backend only
cd backend && uv run uvicorn app.main:app --reload

# Frontend only
cd frontend && pnpm dev

# Lint / build
cd backend && uv run ruff check app
cd frontend && pnpm exec tsc -b && pnpm build

# Pipeline on a sample (from backend)
uv run python ../playground/run_pipeline.py samples/generated/01-en-happy-classic.pdf
```

---

## One-Page Mental Model

```
Upload → Security gates → Save file + DB
              ↓
     Classify (LLM + vision)
              ↓
     Extract (Azure DI prebuilt)
              ↓
     Validate (rules, no LLM)
              ↓
     GL suggest (LLM)
              ↓
     Duplicate check → Review UI → Decision
```

---

## Questions You Can Ask Them

- “Is human review the system of record or do approved docs post to ERP?”
- “Do you need VIES live VAT lookup or format check is enough?”
- “What’s the SLA for processing time per document?”

---

*Good luck — lead with the pipeline diagram, then security + Azure cost story, then honest production gaps.*
