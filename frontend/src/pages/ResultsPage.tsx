import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Hash,
  RefreshCcw,
} from 'lucide-react'
import { getDocument } from '../lib/api'
import type { DocumentResponse } from '../lib/types'
import { StatusBadge } from '../components/StatusBadge'
import { DecisionBar } from '../components/DecisionBar'
import { DocumentReviewPanel } from '../components/DocumentReviewPanel'

export function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DocumentResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getDocument(id)
      .then(setDoc)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={() => navigate('/review')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to upload</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/review')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#659287] dark:bg-[#2B5748] px-4 py-2 text-sm font-semibold text-white dark:text-[#9CB080] hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
        >
          <RefreshCcw className="w-4 h-4" />
          <span>Review another document</span>
        </button>
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        Step 3 of 3
      </p>

      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-64 rounded bg-[var(--border-color)]" />
          <div className="h-4 w-40 rounded bg-[var(--border-color)]" />
          <div className="h-48 rounded-xl bg-[var(--bg-card)]" />
        </div>
      )}

      {!loading && (error || !doc) && (
        <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span>{error ?? 'Document not found.'}</span>
        </div>
      )}

      {!loading && doc && (
        <div className="space-y-6">
          {/* Document metadata header */}
          <div className="space-y-1.5">
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

          {/* Decision Bar */}
          <DecisionBar doc={doc} onUpdated={setDoc} />

          {/* Detailed Review Panel */}
          <DocumentReviewPanel doc={doc} onUpdated={setDoc} />
        </div>
      )}
    </div>
  )
}
