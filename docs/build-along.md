# Build-Along Guide: Document Processing Pipeline

## Pipeline Chaining (Classify → Extract → Validate)

### Outcome
We implemented a lightweight, typed sequential pipeline (`PipelineContext`, `PipelineStep` Protocol, `Pipeline` runner) that chains document classification, Azure Document Intelligence extraction/mapping, and offline business rule validation.

```
document_path ──► ClassificationStep ──► ExtractionStep ──► ValidationStep
                                            │                 │
                           ┌────────────────┴──────────────┐  └► EU VAT Checks
                           ▼                               ▼     + Total Reconciliation
                 InvoiceDocument                 ReceiptDocument
             (prebuilt-invoice)                (prebuilt-receipt)
```

### Why This Design?
1. **Separation of Concerns**: Azure API SDK calls are kept inside provider steps. Financial business rules (VAT format/checksums and subtotal/tax/total math) remain pure, deterministic Python functions.
2. **Sequential Typed Steps**: Shared state is encapsulated in `PipelineContext`. Each step receives `ctx` and returns `ctx`, making steps easy to test in isolation and recombine.
3. **No Provider Leaks**: Raw Azure response dictionaries are serialized and mapped directly to Pydantic domain models (`InvoiceDocument` / `ReceiptDocument`) before downstream steps touch them.

### Verification Commands

1. **Linting and Type Checks**:
   ```bash
   cd backend
   uv run --locked --no-sync ruff check app scripts ../playground
   ```

2. **Run Pipeline on Sample Invoice PDF**:
   ```bash
   cd backend
   uv run python ../playground/run_pipeline.py samples/generated/01-en-happy-classic.pdf
   ```

3. **Run Pipeline on Fuel Receipt PNG**:
   ```bash
   cd backend
   uv run python ../playground/run_pipeline.py samples/generated/13-nl-fuel-receipt.png
   ```

### Checkpoints
- **Model Routing**: Documents labeled as `invoice` trigger `analyze_invoice` (`prebuilt-invoice`); documents labeled as `receipt` trigger `analyze_receipt` (`prebuilt-receipt`).
- **Pydantic Model Dump**: Results serialize into clean, structured JSON containing extracted fields, confidences, and line items.
- **Offline Validation Findings**: `vendor_vat` / `customer_vat` fields are checked against EU VAT rules via `python-stdnum`, and financial totals are reconciled within a €0.01 tolerance.
