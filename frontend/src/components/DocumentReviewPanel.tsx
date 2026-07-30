import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Edit3, Loader2, Save, XCircle } from 'lucide-react'
import { listGlAccounts, overrideGl } from '../lib/api'
import type {
  ClassificationPayload,
  DocumentResponse,
  GlAccountItem,
  GlSuggestionPayload,
  ValidationPayload,
} from '../lib/types'
import { EditFieldsModal } from './EditFieldsModal'

// ─── Tab shell ───────────────────────────────────────────────────────────────

const TABS = ['Classification', 'Extraction', 'Validation', 'GL Suggestion'] as const
type Tab = (typeof TABS)[number]

// ─── Classification tab ───────────────────────────────────────────────────────

function ClassificationTab({ data }: { data: ClassificationPayload | null }) {
  if (!data) return <Empty />
  return (
    <div className="space-y-4">
      <Row label="Type" value={<span className="capitalize font-semibold text-[#659287] dark:text-[#9CB080]">{data.document_type}</span>} />
      <Row label="Confidence" value={`${(data.confidence * 100).toFixed(1)} %`} />
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-1 font-medium">Rationale</p>
        <p className="text-sm text-[var(--text-main)] leading-relaxed">{data.rationale}</p>
      </div>
    </div>
  )
}

// ─── Extraction tab ───────────────────────────────────────────────────────────

function ExtractionTab({
  doc,
  onUpdated,
}: {
  doc: DocumentResponse
  onUpdated?: (updated: DocumentResponse) => void
}) {
  const data = doc.extraction as Record<string, string | null> | null
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (!data) return <Empty />
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Extracted Normalized Fields
        </h3>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] text-xs font-semibold transition-colors cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#659287] dark:text-[#9CB080]" />
          <span>Edit Extraction Fields</span>
        </button>
      </div>

      <div className="divide-y divide-[var(--border-color)]">
        {entries.map(([key, val]) => (
          <div key={key} className="flex gap-4 py-2.5 text-sm">
            <span className="w-44 shrink-0 text-[var(--text-muted)] capitalize font-medium">
              {key.replace(/_/g, ' ')}
            </span>
            <span className="text-[var(--text-main)] break-all font-mono">{val ?? '—'}</span>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <EditFieldsModal
          doc={doc}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUpdated={(updated) => onUpdated?.(updated)}
        />
      )}
    </div>
  )
}

// ─── Validation tab ───────────────────────────────────────────────────────────

function ValidationTab({ data }: { data: ValidationPayload | null }) {
  if (!data) return <Empty />

  const hasIssues = data.findings.length > 0
  const totals = data.totals_check

  return (
    <div className="space-y-6">
      {/* Findings */}
      <section>
        <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider mb-3">Findings</p>
        {hasIssues ? (
          <div className="space-y-2">
            {data.findings.map((f, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-100/90 dark:bg-amber-950/50 p-3.5 text-sm text-amber-950 dark:text-amber-100 font-semibold">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-400 dark:border-emerald-700 bg-emerald-100/90 dark:bg-emerald-950/50 p-3.5 text-sm text-emerald-950 dark:text-emerald-100 font-semibold">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span>No issues found</span>
          </div>
        )}
      </section>

      {/* VAT checks */}
      {data.vat_checks.length > 0 && (
        <section>
          <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider mb-3">VAT Checks</p>
          <div className="space-y-2.5">
            {data.vat_checks.map((v, i) => (
              <div key={i} className={`flex items-center justify-between rounded-lg border p-3.5 text-sm ${
                v.is_valid
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{v.vat_id}</span>
                  <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold">({v.field})</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold">
                  {v.is_valid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <span className="text-emerald-900 dark:text-emerald-200">Valid</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
                      <span className="text-rose-900 dark:text-rose-200">{v.reason ?? 'Invalid'}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Totals */}
      {totals && (
        <section>
          <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider mb-3">Totals Check</p>
          <div className={`flex items-center gap-2.5 rounded-lg border p-3.5 text-sm font-semibold ${
            totals.status === 'ok'
              ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-100/90 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100'
              : 'border-rose-400 dark:border-rose-700 bg-rose-100/90 dark:bg-rose-950/50 text-rose-950 dark:text-rose-100'
          }`}>
            {totals.status === 'ok' ? (
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4.5 h-4.5 text-rose-700 dark:text-rose-400 shrink-0" />
            )}
            <span>{totals.status === 'ok' ? 'Totals balance' : totals.reason ?? 'Mismatch'}</span>
          </div>
        </section>
      )}
    </div>
  )
}

// ─── GL Suggestion tab ────────────────────────────────────────────────────────

function GlTab({
  doc,
  onUpdated,
}: {
  doc: DocumentResponse
  onUpdated?: (updated: DocumentResponse) => void
}) {
  const data = doc.gl_suggestion as GlSuggestionPayload | null

  const [accounts, setAccounts] = useState<GlAccountItem[]>([])
  const [selectedCode, setSelectedCode] = useState<string>(data?.account_code ?? '')
  const [note, setNote] = useState<string>(data?.reviewer_note ?? '')
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listGlAccounts()
      .then(setAccounts)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (data?.account_code) {
      setSelectedCode(data.account_code)
    }
  }, [data?.account_code])

  if (!data) return <Empty />

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setError(null)

    try {
      const updated = await overrideGl(doc.id, {
        account_code: selectedCode,
        note: note.trim() || undefined,
      })
      onUpdated?.(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update GL account.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Active suggestion */}
      <div className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-4xl font-mono font-bold text-[#659287] dark:text-[#9CB080]">
            {data.account_code}
          </span>
          {data.confirmed && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 px-3 py-0.5 text-xs text-emerald-800 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirmed by Reviewer</span>
            </span>
          )}
        </div>
        <Row label="Confidence" value={`${(data.confidence * 100).toFixed(1)} %`} />
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1 font-medium">Reasoning</p>
          <p className="text-sm text-[var(--text-main)] leading-relaxed">{data.reasoning}</p>
        </div>
        {data.reviewer_note && (
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-1 font-medium">Reviewer Note</p>
            <p className="text-sm text-amber-800 dark:text-amber-300/80 italic">{data.reviewer_note}</p>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border-color)] pt-6 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Confirm or Override GL Account
        </h4>

        {error && (
          <div className="p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-300 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleOverride} className="space-y-4 max-w-lg">
          <div className="space-y-1">
            <label htmlFor="gl-account-select" className="block text-xs font-semibold text-[var(--text-muted)]">
              Northstar GL Account Catalog
            </label>
            <select
              id="gl-account-select"
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] px-3.5 py-2.5 text-sm text-[var(--text-main)] focus:outline-hidden focus:border-[#659287] dark:focus:border-[#9CB080] transition-colors font-medium"
            >
              {accounts.map((acc) => (
                <option key={acc.code} value={acc.code}>
                  {acc.code} — {acc.description}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="reviewer-note" className="block text-xs font-semibold text-[var(--text-muted)]">
              Reviewer Note (Optional)
            </label>
            <input
              id="reviewer-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Confirmed for IT software subscription"
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] px-3.5 py-2 text-sm text-[var(--text-main)] focus:outline-hidden focus:border-[#659287] dark:focus:border-[#9CB080] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={updating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#659287] dark:bg-[#2B5748] hover:opacity-95 text-white dark:text-[#9CB080] font-semibold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {updating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating GL…</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Confirm / Override Account</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 text-sm">
      <span className="w-32 shrink-0 text-[var(--text-muted)] font-medium">{label}</span>
      <span className="text-[var(--text-main)]">{value}</span>
    </div>
  )
}

function Empty() {
  return <p className="text-sm text-[var(--text-muted)] italic">No data available for this stage.</p>
}

// ─── Shared panel ─────────────────────────────────────────────────────────────

interface DocumentReviewPanelProps {
  doc: DocumentResponse
  onUpdated?: (updated: DocumentResponse) => void
}

export function DocumentReviewPanel({ doc, onUpdated }: DocumentReviewPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Classification')

  return (
    <div className="space-y-6">
      {/* Issues banner */}
      {doc.issues && doc.issues.length > 0 && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{doc.issues.length} issue{doc.issues.length > 1 ? 's' : ''} flagged</span>
          </div>
          <ul className="space-y-1 pl-6 list-disc">
            {doc.issues.map((issue, i) => (
              <li key={i} className="text-xs text-amber-800 dark:text-amber-300/80">{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-[var(--border-color)] mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors -mb-px border-b-2 cursor-pointer ${
                activeTab === tab
                  ? 'border-[#659287] dark:border-[#9CB080] text-[#659287] dark:text-[#9CB080]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-sm">
          {activeTab === 'Classification' && <ClassificationTab data={doc.classification as ClassificationPayload | null} />}
          {activeTab === 'Extraction' && <ExtractionTab doc={doc} onUpdated={onUpdated} />}
          {activeTab === 'Validation' && <ValidationTab data={doc.validation as ValidationPayload | null} />}
          {activeTab === 'GL Suggestion' && <GlTab doc={doc} onUpdated={onUpdated} />}
        </div>
      </div>
    </div>
  )
}
