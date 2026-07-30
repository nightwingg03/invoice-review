import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Hash,
  XCircle,
} from 'lucide-react'
import { getDocument } from '../lib/api'
import type {
  ClassificationPayload,
  DocumentResponse,
  GlSuggestionPayload,
  ValidationPayload,
} from '../lib/types'
import { StatusBadge } from '../components/StatusBadge'

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

function ExtractionTab({ data }: { data: Record<string, string | null> | null }) {
  if (!data) return <Empty />
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined)
  return (
    <div className="divide-y divide-[var(--border-color)]">
      {entries.map(([key, val]) => (
        <div key={key} className="flex gap-4 py-2.5 text-sm">
          <span className="w-44 shrink-0 text-[var(--text-muted)] capitalize font-medium">{key.replace(/_/g, ' ')}</span>
          <span className="text-[var(--text-main)] break-all">{val ?? '—'}</span>
        </div>
      ))}
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
        <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-3">Findings</p>
        {hasIssues ? (
          <div className="space-y-2">
            {data.findings.map((f, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm text-emerald-900 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>No issues found</span>
          </div>
        )}
      </section>

      {/* VAT checks */}
      {data.vat_checks.length > 0 && (
        <section>
          <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-3">VAT Checks</p>
          <div className="space-y-2">
            {data.vat_checks.map((v, i) => (
              <div key={i} className={`flex items-center justify-between rounded-lg border p-3 text-sm ${v.is_valid ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20'}`}>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-[var(--text-main)]">{v.vat_id}</span>
                  <span className="text-[var(--text-muted)] text-xs">({v.field})</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  {v.is_valid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400">Valid</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span className="text-rose-700 dark:text-rose-400">{v.reason ?? 'Invalid'}</span>
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
          <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-3">Totals Check</p>
          <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${totals.status === 'ok' ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300' : 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300'}`}>
            {totals.status === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{totals.status === 'ok' ? 'Totals balance' : totals.reason ?? 'Mismatch'}</span>
          </div>
        </section>
      )}
    </div>
  )
}

// ─── GL Suggestion tab ────────────────────────────────────────────────────────

function GlTab({ data }: { data: GlSuggestionPayload | null }) {
  if (!data) return <Empty />
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-4xl font-mono font-bold text-[#659287] dark:text-[#9CB080]">{data.account_code}</span>
        {data.confirmed && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 px-3 py-0.5 text-xs text-emerald-800 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirmed</span>
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

// ─── Main page ────────────────────────────────────────────────────────────────

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<DocumentResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Classification')

  useEffect(() => {
    if (!id) return
    getDocument(id)
      .then(setDoc)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-64 rounded bg-[var(--border-color)]" />
        <div className="h-4 w-40 rounded bg-[var(--border-color)]" />
        <div className="h-48 rounded-xl bg-[var(--bg-card)]" />
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-800 dark:text-rose-300 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
        <span>{error ?? 'Document not found.'}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-[var(--text-main)] truncate">{doc.filename}</h1>
            <StatusBadge status={doc.status} />
            {doc.document_type && (
              <span className="capitalize text-xs text-[#659287] dark:text-[#9CB080] border border-[var(--border-color)] rounded-full px-2.5 py-0.5 bg-[var(--bg-card)] font-medium">
                {doc.document_type}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] flex-wrap">
            {doc.vendor_name && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#659287] dark:text-[#9CB080]" />
                <span>Vendor: {doc.vendor_name}</span>
              </span>
            )}
            {doc.invoice_number && (
              <span className="flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-[#659287] dark:text-[#9CB080]" />
                <span>Invoice: {doc.invoice_number}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#659287] dark:text-[#9CB080]" />
              <span>Uploaded: {new Date(doc.created_at).toLocaleString()}</span>
            </span>
          </div>
        </div>

        <Link
          to="/documents"
          className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to list</span>
        </Link>
      </div>

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
          {activeTab === 'Extraction' && <ExtractionTab data={doc.extraction as Record<string, string | null> | null} />}
          {activeTab === 'Validation' && <ValidationTab data={doc.validation as ValidationPayload | null} />}
          {activeTab === 'GL Suggestion' && <GlTab data={doc.gl_suggestion as GlSuggestionPayload | null} />}
        </div>
      </div>
    </div>
  )
}
