# API & Pipeline Reference

## Architecture

```
Frontend / Client
       │
       ▼
  FastAPI (app/main.py)
       │
  ┌────┴──────────────────┐
  │ app/documents/routes  │  ← HTTP: parsing, status codes, 4 MB limit
  └────┬──────────────────┘
       │
  ┌────┴──────────────────┐
  │ app/documents/service │  ← Orchestration: pipeline, duplicate check, mutations
  └────┬──────────────────┘
       │
  ┌────┴──────────────────────┐
  │ app/documents/repository  │  ← DB only: SQLite via SQLAlchemy
  └───────────────────────────┘
```

---

## Pipeline (4 steps, always chained)

```
PDF / Image
    │
    ▼
ClassificationStep  → DocumentClassification (invoice | receipt)
    │
    ▼
ExtractionStep      → InvoiceDocument | ReceiptDocument
    │
    ▼
ValidationStep      → FinancialValidationResult (VAT + totals checks)
    │
    ▼
GlCategorizationStep → GlSuggestion (account_code 4000–4900)
```

Each step's output is stored as its own JSON column in `documents.db`.

---

## Endpoints

| Method | Path | Purpose | Success |
|--------|------|---------|---------|
| `POST` | `/api/documents` | Upload document, run pipeline, persist | 201 |
| `GET` | `/api/documents` | List all reviews, newest first | 200 |
| `GET` | `/api/documents/{id}` | Fetch one review | 200 |
| `GET` | `/api/documents/{id}/file` | Serve the stored upload | 200 |
| `PUT` | `/api/documents/{id}` | Apply field corrections | 200 |
| `PUT` | `/api/documents/{id}/accounting` | Confirm or override GL account | 200 |
| `POST` | `/api/documents/{id}/decision` | Approve or reject | 200 |
| `POST` | `/api/documents/{id}/correction-email` | Draft supplier correction email | 200 |
| `DELETE` | `/api/documents/{id}` | Delete review and file | 204 |
| `GET` | `/api/accounting/gl-accounts` | Return fixed GL catalog | 200 |
| `GET` | `/health` | Liveness check | 200 |

---

## Upload constraints

- Allowed content types: `application/pdf`, `image/jpeg`, `image/png`
- Maximum file size: **4 MB**
- Files stored under `backend/data/uploads/{uuid}_{original_filename}`

---

## Error codes

| HTTP | Cause |
|------|-------|
| 404 | Document ID not found |
| 413 | File exceeds 4 MB |
| 422 | Unsupported file type or invalid request body |
| 502 | Pipeline failed during processing |

---

## GL Account Catalog

| Code | Account |
|------|---------|
| 4000 | Office Supplies & Stationery |
| 4100 | Facilities & Building Maintenance |
| 4200 | Utilities (Electricity, Water, Gas) |
| 4300 | IT Hardware & Software Licensing |
| 4400 | Fuel & Vehicle Travel Expenses |
| 4500 | Meals & Client Entertainment |
| 4600 | Professional Services & Legal Fees |
| 4700 | Cleaning & Janitorial Services |
| 4800 | Marketing & Advertising |
| 4900 | Telecommunications & Internet |

---

## Running locally

```bash
cd backend
uv run uvicorn app.main:app --reload
```

Interactive docs: http://localhost:8000/docs
