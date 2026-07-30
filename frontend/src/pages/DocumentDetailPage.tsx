import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Hash,
} from 'lucide-react'
import { getDocument } from '../lib/api'
import type { DocumentResponse } from '../lib/types'
import { StatusBadge } from '../components/StatusBadge'
import { DecisionBar } from '../components/DecisionBar'
import { DocumentReviewPanel } from '../components/DocumentReviewPanel'

// ─── Main page ────────────────────────────────────────────────────────────────

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
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
          to="/history"
          className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to list</span>
        </Link>
      </div>

      {/* Decision Bar */}
      <DecisionBar doc={doc} onUpdated={setDoc} />

      {/* Detailed Review Panel */}
      <DocumentReviewPanel doc={doc} onUpdated={setDoc} />
    </div>
  )
}
