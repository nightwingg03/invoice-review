import { useState } from 'react'
import { Edit3, Loader2, Save, X } from 'lucide-react'
import { applyCorrections } from '../lib/api'
import type { DocumentResponse } from '../lib/types'

interface EditFieldsModalProps {
  doc: DocumentResponse
  isOpen: boolean
  onClose: () => void
  onUpdated: (updatedDoc: DocumentResponse) => void
}

const FIELD_LABELS: Record<string, string> = {
  vendor_name: 'Vendor Name',
  invoice_id: 'Invoice Number / ID',
  invoice_date: 'Invoice Date',
  due_date: 'Due Date',
  po_number: 'PO Number',
  currency: 'Currency',
  subtotal: 'Subtotal Amount',
  vat_amount: 'VAT Amount',
  total_amount: 'Total Amount',
  vendor_tax_id: 'Vendor VAT / Tax ID',
  customer_tax_id: 'Customer VAT / Tax ID',
}

export function EditFieldsModal({
  doc,
  isOpen,
  onClose,
  onUpdated,
}: EditFieldsModalProps) {
  const rawExtraction = (doc.extraction ?? {}) as Record<string, string | null>

  const [fields, setFields] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    Object.keys(FIELD_LABELS).forEach((key) => {
      initial[key] = rawExtraction[key] ?? ''
    })
    return initial
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Build corrections dictionary
      const corrections: Record<string, string> = {}
      Object.entries(fields).forEach(([k, v]) => {
        corrections[k] = v.trim()
      })

      const updated = await applyCorrections(doc.id, { corrections })
      onUpdated(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save corrections.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E6F2DD] dark:bg-[#273338] text-[#659287] dark:text-[#9CB080]">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-main)]">Edit Extracted Fields</h2>
              <p className="text-xs text-[var(--text-muted)]">Update extracted invoice values to correct errors</p>
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

        {/* Form Body */}
        <form id="edit-fields-form" onSubmit={handleSave} className="space-y-4 overflow-y-auto pr-1 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-300 font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <label htmlFor={key} className="block text-xs font-semibold text-[var(--text-muted)]">
                  {label}
                </label>
                <input
                  id={key}
                  type="text"
                  value={fields[key] ?? ''}
                  onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] px-3.5 py-2 text-sm text-[var(--text-main)] focus:outline-hidden focus:border-[#659287] dark:focus:border-[#9CB080] transition-colors"
                  placeholder={`Enter ${label.toLowerCase()}...`}
                />
              </div>
            ))}
          </div>
        </form>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border-color)] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-fields-form"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#659287] dark:bg-[#2B5748] hover:opacity-95 text-white dark:text-[#9CB080] font-semibold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Corrections</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
