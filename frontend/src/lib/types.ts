// ─── Response shapes ────────────────────────────────────────────────────────

export interface DocumentResponse {
  id: string
  filename: string
  status: 'pending' | 'processed' | 'failed' | 'approved' | 'rejected'
  document_type: 'invoice' | 'receipt' | null

  classification: ClassificationPayload | null
  extraction: Record<string, string | null> | null
  validation: ValidationPayload | null
  gl_suggestion: GlSuggestionPayload | null

  review_data: Record<string, unknown> | null
  issues: string[] | null

  vendor_name: string | null
  invoice_number: string | null

  created_at: string
  updated_at: string
}

export interface ClassificationPayload {
  document_type: string
  confidence: number
  rationale: string
}

export interface ValidationPayload {
  findings: string[]
  vat_checks: VatCheck[]
  totals_check: TotalsCheck | null
}

export interface VatCheck {
  vat_id: string
  field: string
  is_valid: boolean
  country_code: string | null
  reason: string | null
}

export interface TotalsCheck {
  status: 'ok' | 'invalid'
  reason: string | null
  declared_subtotal: number | null
  declared_tax: number | null
  declared_total: number | null
  computed_total: number | null
}

export interface GlSuggestionPayload {
  account_code: string
  confidence: number
  reasoning: string
  confirmed?: boolean
  reviewer_note?: string
}

export interface GlAccountItem {
  code: string
  description: string
}

export interface CorrectionEmailResponse {
  draft: string
}

// ─── Request bodies ─────────────────────────────────────────────────────────

export interface CorrectionRequest {
  corrections: Record<string, unknown>
}

export interface AccountingOverrideRequest {
  account_code: string
  note?: string
}

export interface DecisionRequest {
  decision: 'approved' | 'rejected'
  note?: string
}
