import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Building2, Calendar, FileText, FolderOpen, Hash, Plus, Trash2 } from 'lucide-react'
import { deleteDocument, listDocuments } from '../lib/api'
import type { DocumentResponse } from '../lib/types'
import { StatusBadge } from '../components/StatusBadge'
import { AlertDialog } from '../components/AlertDialog'

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 animate-pulse space-y-3">
      <div className="h-4 w-48 rounded bg-[var(--border-color)]" />
      <div className="h-3 w-24 rounded bg-[var(--border-color)]" />
      <div className="h-3 w-32 rounded bg-[var(--border-color)]" />
    </div>
  )
}

function DocumentCard({ doc, onDelete }: { doc: DocumentResponse; onDelete: (doc: DocumentResponse) => void }) {
  const date = new Date(doc.created_at).toLocaleString()
  const type = doc.document_type
    ? doc.document_type.charAt(0).toUpperCase() + doc.document_type.slice(1)
    : '—'

  return (
    <div className="group relative rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--border-accent)] hover:bg-[var(--bg-card-hover)] transition-all duration-200 p-5 shadow-sm">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDelete(doc)
        }}
        title="Delete document"
        aria-label="Delete document"
        className="absolute top-4 right-4 p-2 rounded-lg text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer z-10"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <Link to={`/documents/${doc.id}`} className="block">
        <div className="flex items-start justify-between gap-4 pr-8">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#659287] dark:text-[#9CB080] shrink-0" />
              <p className="font-semibold text-[var(--text-main)] truncate group-hover:text-[#659287] dark:group-hover:text-[#9CB080] transition-colors">
                {doc.filename}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Calendar className="w-3.5 h-3.5" />
              <span>{date}</span>
            </div>
          </div>
          <StatusBadge status={doc.status} />
        </div>

        <div className="mt-4 flex items-center gap-5 text-xs text-[var(--text-muted)] flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="font-medium text-[var(--text-main)]">Type:</span>
            <span>{type}</span>
          </span>
          {doc.vendor_name && (
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#659287] dark:text-[#9CB080]" />
              <span className="font-medium text-[var(--text-main)]">Vendor:</span>
              <span className="truncate max-w-[12rem]">{doc.vendor_name}</span>
            </span>
          )}
          {doc.invoice_number && (
            <span className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-[#659287] dark:text-[#9CB080]" />
              <span className="font-medium text-[var(--text-main)]">Invoice:</span>
              <span>{doc.invoice_number}</span>
            </span>
          )}
        </div>

        {doc.issues && doc.issues.length > 0 && (
          <div className="mt-3 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{doc.issues.length} issue{doc.issues.length > 1 ? 's' : ''} flagged</span>
          </div>
        )}
      </Link>
    </div>
  )
}

export function HistoryPage() {
  const [docs, setDocs] = useState<DocumentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DocumentResponse | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    listDocuments()
      .then(setDocs)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return
    try {
      await deleteDocument(pendingDelete.id)
      setDocs((prev) => prev.filter((d) => d.id !== pendingDelete.id))
      setDeleteError(null)
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete document')
    } finally {
      setPendingDelete(null)
    }
  }, [pendingDelete])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">Review history</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">All processed document reviews, newest first</p>
        </div>
        <Link
          to="/review"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#659287] dark:bg-[#2B5748] px-4 py-2 text-sm font-semibold text-white dark:text-[#9CB080] hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New document</span>
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 text-sm text-rose-800 dark:text-rose-300">
          {error}
        </div>
      )}

      {deleteError && (
        <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 text-sm text-rose-800 dark:text-rose-300">
          {deleteError}
        </div>
      )}

      {!loading && !error && docs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-[var(--text-muted)] space-y-3 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]">
          <FolderOpen className="w-12 h-12 text-[#659287] dark:text-[#9CB080]" />
          <p className="font-semibold text-lg text-[var(--text-main)]">No documents yet</p>
          <p className="text-sm max-w-sm">Upload your first invoice or receipt to trigger processing.</p>
        </div>
      )}

      {!loading && docs.length > 0 && (
        <div className="space-y-3">
          {docs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onDelete={setPendingDelete} />
          ))}
        </div>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        title="Delete document?"
        description="This will permanently delete the document and its stored file. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
