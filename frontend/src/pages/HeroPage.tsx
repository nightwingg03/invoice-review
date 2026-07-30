import { useNavigate } from 'react-router-dom'
import { History, UploadCloud } from 'lucide-react'

export function HeroPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center my-auto w-full py-4">
      {/* Hero Card Container */}
      <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-8 sm:p-10 shadow-md space-y-8">

        {/* Card Header & Title */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Northstar Facilities B.V.
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)]">
              Document review
            </h1>
          </div>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Upload an invoice or receipt, run the review pipeline, and inspect the prepared result before bookkeeping.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => navigate('/review')}
              className="bg-[#659287] dark:bg-[#2B5748] hover:opacity-95 text-white dark:text-[#9CB080] font-semibold px-5 py-2.5 rounded-xl text-sm shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Review a document</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="bg-transparent hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] border border-[var(--border-color)] font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <History className="w-4 h-4 text-[var(--text-muted)]" />
              <span>View history</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border-color)]" />

        {/* How It Works Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[var(--text-main)] tracking-tight">
            How it works
          </h2>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="w-7 h-7 rounded-lg bg-[var(--badge-bg)] text-[var(--badge-text)] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-0.5 sm:flex sm:items-baseline sm:gap-6">
                <p className="font-bold text-sm text-[var(--text-main)] sm:w-44 shrink-0">
                  Upload a document
                </p>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Choose an invoice or receipt and check the preview.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="w-7 h-7 rounded-lg bg-[var(--badge-bg)] text-[var(--badge-text)] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-0.5 sm:flex sm:items-baseline sm:gap-6">
                <p className="font-bold text-sm text-[var(--text-main)] sm:w-44 shrink-0">
                  Run the pipeline
                </p>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Classify, extract, validate VAT and policy, then suggest a GL account.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="w-7 h-7 rounded-lg bg-[var(--badge-bg)] text-[var(--badge-text)] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <div className="space-y-0.5 sm:flex sm:items-baseline sm:gap-6">
                <p className="font-bold text-sm text-[var(--text-main)] sm:w-44 shrink-0">
                  Inspect the result
                </p>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Review classification, extraction, findings, and the GL suggestion.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
