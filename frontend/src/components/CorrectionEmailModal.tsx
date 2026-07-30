import { useEffect, useState } from 'react'
import { Check, Copy, Loader2, Mail, X } from 'lucide-react'
import { draftCorrectionEmail } from '../lib/api'

interface CorrectionEmailModalProps {
  docId: string
  isOpen: boolean
  onClose: () => void
}

export function CorrectionEmailModal({
  docId,
  isOpen,
  onClose,
}: CorrectionEmailModalProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen && docId) {
      setLoading(true)
      setError(null)
      draftCorrectionEmail(docId)
        .then((res) => setDraft(res.draft))
        .catch((err) =>
          setError(err instanceof Error ? err.message : 'Failed to generate email draft.')
        )
        .finally(() => setLoading(false))
    }
  }, [isOpen, docId])

  if (!isOpen) return null

  const handleCopy = () => {
    if (!draft) return
    void navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-main)]">Draft Supplier Correction Email</h2>
              <p className="text-xs text-[var(--text-muted)]">Draft email requesting supplier corrections for flagged issues</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#659287] dark:text-[#9CB080]" />
              <p className="text-xs text-[var(--text-muted)] font-medium">Generating email draft from review issues…</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-300 font-semibold">
              {error}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Plain-Text Email Draft (Never Sent Automatically)
                </span>
                {copied && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Copied to clipboard!
                  </span>
                )}
              </div>
              <textarea
                readOnly
                value={draft ?? ''}
                rows={10}
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-page)] p-4 text-xs font-mono text-[var(--text-main)] focus:outline-hidden resize-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border-color)] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!draft || loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#659287] dark:bg-[#2B5748] hover:opacity-95 text-white dark:text-[#9CB080] font-semibold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Email Draft</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
