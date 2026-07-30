import { useState } from 'react'
import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react'
import { setDecision } from '../lib/api'
import type { DocumentResponse } from '../lib/types'
import { CorrectionEmailModal } from './CorrectionEmailModal'

interface DecisionBarProps {
  doc: DocumentResponse
  onUpdated: (updated: DocumentResponse) => void
}

export function DecisionBar({ doc, onUpdated }: DecisionBarProps) {
  const [submitting, setSubmitting] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState<'approved' | 'rejected' | null>(null)
  const [note, setNote] = useState('')
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDecisionSubmit = async (decision: 'approved' | 'rejected') => {
    setSubmitting(true)
    setError(null)

    try {
      const updated = await setDecision(doc.id, {
        decision,
        note: note.trim() || undefined,
      })
      onUpdated(updated)
      setShowNoteInput(null)
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record decision.')
    } finally {
      setSubmitting(false)
    }
  }

  const hasIssues = doc.issues && doc.issues.length > 0
  const isRejected = doc.status === 'rejected'

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-main)]">Review Decision & Actions</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Approve document for bookkeeping, reject with feedback, or draft supplier correction email
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Draft Email button */}
          {(hasIssues || isRejected) && (
            <button
              type="button"
              onClick={() => setIsEmailModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700 dark:hover:bg-amber-600 font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Mail className="w-4 h-4 text-white" />
              <span>Draft Correction Email</span>
            </button>
          )}

          {/* Approve button */}
          <button
            type="button"
            onClick={() => {
              if (showNoteInput === 'approved') {
                void handleDecisionSubmit('approved')
              } else {
                setShowNoteInput('approved')
              }
            }}
            disabled={submitting}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
              doc.status === 'approved'
                ? 'bg-emerald-700 text-white dark:bg-emerald-800'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-800 dark:hover:bg-emerald-700'
            }`}
          >
            {submitting && showNoteInput === 'approved' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{doc.status === 'approved' ? 'Approved' : 'Approve Document'}</span>
          </button>

          {/* Reject button */}
          <button
            type="button"
            onClick={() => {
              if (showNoteInput === 'rejected') {
                void handleDecisionSubmit('rejected')
              } else {
                setShowNoteInput('rejected')
              }
            }}
            disabled={submitting}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
              doc.status === 'rejected'
                ? 'bg-rose-700 text-white dark:bg-rose-800'
                : 'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-800 dark:hover:bg-rose-700'
            }`}
          >
            {submitting && showNoteInput === 'rejected' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span>{doc.status === 'rejected' ? 'Rejected' : 'Reject Document'}</span>
          </button>
        </div>
      </div>

      {/* Note input popup drawer */}
      {showNoteInput && (
        <div className="pt-3 border-t border-[var(--border-color)] space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <label htmlFor="decision-note" className="text-xs font-bold text-[var(--text-main)] capitalize">
              Add Decision Note for "{showNoteInput}" (Optional)
            </label>
            <button
              type="button"
              onClick={() => setShowNoteInput(null)}
              className="text-xs text-[var(--text-muted)] hover:underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="flex gap-2">
            <input
              id="decision-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Enter reason for ${showNoteInput} decision...`}
              className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] px-3.5 py-2 text-xs text-[var(--text-main)] focus:outline-hidden focus:border-[#659287] dark:focus:border-[#9CB080]"
            />
            <button
              type="button"
              onClick={() => void handleDecisionSubmit(showNoteInput)}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-[#659287] dark:bg-[#2B5748] hover:opacity-95 text-white dark:text-[#9CB080] text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Submit {showNoteInput}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-300 font-semibold">
          {error}
        </div>
      )}

      {isEmailModalOpen && (
        <CorrectionEmailModal
          docId={doc.id}
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
        />
      )}
    </div>
  )
}
