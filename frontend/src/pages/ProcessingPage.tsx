import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'
import { uploadDocument } from '../lib/api'
import type { DocumentResponse } from '../lib/types'

type StepStatus = 'pending' | 'running' | 'done' | 'error'

interface Step {
  key: string
  label: string
  description: string
  status: StepStatus
}

const INITIAL_STEPS: Step[] = [
  {
    key: 'classify',
    label: 'Classify',
    description: 'Identifying document type (invoice or receipt)',
    status: 'pending',
  },
  {
    key: 'extract',
    label: 'Extract',
    description: 'Reading vendor, amounts, dates, and line items',
    status: 'pending',
  },
  {
    key: 'validate',
    label: 'Validate',
    description: 'Checking VAT numbers and totals reconciliation',
    status: 'pending',
  },
  {
    key: 'suggest_gl',
    label: 'Suggest GL',
    description: 'Recommending general ledger account category',
    status: 'pending',
  },
]

const STEP_DURATIONS = [4000, 7000, 4000, 5000] // ms per step

export function ProcessingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const fileState = location.state as { file?: File } | null
  const file = fileState?.file

  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS)
  const [error, setError] = useState<string | null>(null)

  const resultRef = useRef<DocumentResponse | null>(null)
  const timersDoneRef = useRef(false)
  const isCancelledRef = useRef(false)

  // Redirect if no file provided
  useEffect(() => {
    if (!file) {
      navigate('/review', { replace: true })
    }
  }, [file, navigate])

  useEffect(() => {
    if (!file) return

    isCancelledRef.current = false

    // Check if both POST and timers are complete
    const checkNavigation = () => {
      if (isCancelledRef.current) return
      if (resultRef.current && timersDoneRef.current) {
        setTimeout(() => {
          if (!isCancelledRef.current && resultRef.current) {
            navigate(`/results/${resultRef.current.id}`, { replace: true })
          }
        }, 500)
      }
    }

    // 1. Fire backend API call
    uploadDocument(file)
      .then((res) => {
        if (isCancelledRef.current) return
        resultRef.current = res
        checkNavigation()
      })
      .catch((err) => {
        if (isCancelledRef.current) return
        const msg = err instanceof Error ? err.message : 'Pipeline execution failed.'
        setError(msg)
        setSteps((prev) =>
          prev.map((s) =>
            s.status === 'running' ? { ...s, status: 'error' } : s
          )
        )
      })

    // 2. Run simulated timers for 4 steps
    let timeoutId: ReturnType<typeof setTimeout>

    const runStep = (index: number) => {
      if (isCancelledRef.current || error) return

      if (index >= INITIAL_STEPS.length) {
        timersDoneRef.current = true
        checkNavigation()
        return
      }

      setSteps((prev) =>
        prev.map((s, idx) => {
          if (idx < index) return { ...s, status: 'done' }
          if (idx === index) return { ...s, status: 'running' }
          return { ...s, status: 'pending' }
        })
      )

      timeoutId = setTimeout(() => {
        setSteps((prev) =>
          prev.map((s, idx) => (idx === index ? { ...s, status: 'done' } : s))
        )
        runStep(index + 1)
      }, STEP_DURATIONS[index])
    }

    runStep(0)

    return () => {
      isCancelledRef.current = true
      clearTimeout(timeoutId)
    }
  }, [file, navigate, error])

  if (!file) return null

  const completedCount = steps.filter((s) => s.status === 'done').length
  const progressPercent = Math.min(100, Math.round((completedCount / steps.length) * 100))

  return (
    <div className="flex flex-col items-center justify-center my-auto w-full py-6">
      <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-8 sm:p-10 shadow-md space-y-8">
        
        {/* Header */}
        <div className="space-y-1.5 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-[#659287] dark:text-[#9CB080]">
            Pipeline In Progress
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-main)] truncate max-w-full">
            Processing "{file.name}"
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Running document classification, extraction, validation, and GL categorization.
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-[var(--text-muted)]">
            <span>Progress ({completedCount} of 4 steps)</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[var(--border-color)] overflow-hidden">
            <div
              className="h-full bg-[#659287] dark:bg-[#9CB080] transition-all duration-700 ease-in-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Step List */}
        <div className="space-y-3.5 divide-y divide-[var(--border-color)]/40">
          {steps.map((step, idx) => {
            const isRunning = step.status === 'running'
            const isDone = step.status === 'done'
            const isError = step.status === 'error'

            return (
              <div
                key={step.key}
                className={`pt-3.5 first:pt-0 flex items-center justify-between gap-4 transition-colors ${
                  isRunning ? 'opacity-100' : isDone ? 'opacity-90' : 'opacity-50'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : isRunning ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#659287] dark:text-[#9CB080]" />
                    ) : isError ? (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-[var(--text-muted)]" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className={`text-sm font-bold truncate ${isRunning ? 'text-[#659287] dark:text-[#9CB080]' : 'text-[var(--text-main)]'}`}>
                      {idx + 1}. {step.label}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {step.description}
                    </p>
                  </div>
                </div>

                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                  isDone
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                    : isRunning
                      ? 'border-[#88BDA4] dark:border-[#618764] bg-[#E6F2DD] dark:bg-[#273338] text-[#659287] dark:text-[#9CB080]'
                      : isError
                        ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                        : 'border-[var(--border-color)] bg-[var(--bg-page)] text-[var(--text-muted)]'
                }`}>
                  {isDone ? 'Done' : isRunning ? 'Running…' : isError ? 'Failed' : 'Waiting'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Error box if failed */}
        {error && (
          <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 space-y-3 text-sm">
            <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-200">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Pipeline execution failed</span>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300/90">{error}</p>
            <div className="pt-1">
              <Link
                to="/review"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
              >
                Try again
              </Link>
            </div>
          </div>
        )}

        {/* Footer info */}
        {!error && (
          <p className="text-center text-xs text-[var(--text-muted)]">
            Please keep this page open. Processing usually completes within 20–30 seconds.
          </p>
        )}

      </div>
    </div>
  )
}
