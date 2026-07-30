import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  Loader2,
  RefreshCcw,
  UploadCloud,
} from 'lucide-react'

type PageState = 'empty' | 'ready' | 'processing' | 'error'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_MB = 4

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function ReviewPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<PageState>('empty')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const selectFile = useCallback(
    (candidate: File) => {
      if (!ALLOWED_TYPES.includes(candidate.type)) {
        setError('Unsupported file type. Please choose a PDF, JPEG, or PNG.')
        setState('error')
        return
      }
      if (candidate.size > MAX_MB * 1024 * 1024) {
        setError(`File exceeds ${MAX_MB} MB limit.`)
        setState('error')
        return
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setFile(candidate)
      setPreviewUrl(URL.createObjectURL(candidate))
      setError(null)
      setState('ready')
    },
    [previewUrl],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const dropped = e.dataTransfer.files[0]
      if (dropped) selectFile(dropped)
    },
    [selectFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const chosen = e.target.files?.[0]
      if (chosen) selectFile(chosen)
    },
    [selectFile],
  )

  const handleProcess = useCallback(() => {
    if (!file) return
    navigate('/processing', { state: { file } })
  }, [file, navigate])

  const isImage = file?.type.startsWith('image/')
  const isProcessing = state === 'processing'

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-4">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors self-start cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="relative w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-5">
        {/* Left panel — PDF preview */}
        <div className="md:col-span-3 p-6 sm:p-8 space-y-4 border-b md:border-b-0 md:border-r border-[var(--border-color)]">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Step 1 of 3
            </p>
            <h1 className="text-xl font-bold text-[var(--text-main)]">
              Choose an invoice or receipt
            </h1>
          </div>

          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`
                relative w-full min-h-[22rem] rounded-2xl border-2 border-dashed p-8
                flex flex-col items-center justify-center gap-4 transition-all duration-200 cursor-pointer
                ${isDragging
                  ? 'border-[#659287] dark:border-[#9CB080] bg-[#88BDA4]/20 dark:bg-[#2B5748]/60 scale-[1.01]'
                  : 'border-[var(--border-accent)] bg-[var(--bg-page)]/40 hover:border-[#659287] dark:hover:border-[#9CB080] hover:bg-[var(--bg-card-hover)]'
                }
              `}
            >
              <div className="p-3.5 rounded-2xl bg-[#E6F2DD] dark:bg-[#273338] text-[#659287] dark:text-[#9CB080]">
                {isDragging ? (
                  <UploadCloud className="w-8 h-8 scale-110 transition-transform" />
                ) : (
                  <FileText className="w-8 h-8" />
                )}
              </div>
              <div className="text-center space-y-1">
                <p className="text-[var(--text-main)] font-semibold text-sm">
                  {isDragging ? 'Drop file to preview' : 'Drag & drop your invoice or receipt here'}
                </p>
                <p className="text-[var(--text-muted)] text-xs">
                  or click to browse from disk (PDF, JPEG, PNG · max {MAX_MB} MB)
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,image/jpeg,image/png"
                className="hidden"
                onChange={handleChange}
              />
            </div>
          ) : (
            <div className="w-full min-h-[22rem] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-page)]/40 overflow-hidden">
              {isImage ? (
                <img
                  src={previewUrl ?? undefined}
                  alt={file.name}
                  className="w-full h-full max-h-[28rem] object-contain bg-[var(--bg-page)]"
                />
              ) : (
                <iframe
                  src={previewUrl ?? undefined}
                  title={file.name}
                  className="w-full h-[28rem] border-0"
                >
                  <embed src={previewUrl ?? undefined} type="application/pdf" className="w-full h-[28rem]" />
                </iframe>
              )}
            </div>
          )}
        </div>

        {/* Right panel — action sidebar */}
        <div className="md:col-span-2 p-6 sm:p-8 space-y-6 flex flex-col">
          {!file ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center gap-3 py-10">
              <div className="p-3.5 rounded-2xl bg-[var(--badge-bg)] text-[var(--badge-text)]">
                <FileText className="w-7 h-7" />
              </div>
              <p className="text-sm text-[var(--text-muted)]">Select a file to preview</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[var(--text-main)]">Ready to process</h2>
              </div>

              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)]/40 p-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--text-muted)] font-medium">Filename</span>
                  <span className="text-[var(--text-main)] truncate max-w-[12rem] text-right">{file.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--text-muted)] font-medium">Size</span>
                  <span className="text-[var(--text-main)]">{formatBytes(file.size)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--text-muted)] font-medium">Type</span>
                  <span className="text-[var(--text-main)]">{file.type || 'unknown'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isProcessing}
                className="text-xs font-semibold text-[#659287] dark:text-[#9CB080] hover:underline self-start cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span>Choose a different file</span>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,image/jpeg,image/png"
                className="hidden"
                onChange={handleChange}
              />

              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                The app classifies the document, extracts fields, validates VAT and policy, then suggests a GL account.
              </p>

              {state === 'error' && error && (
                <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 flex items-start gap-2.5 text-sm">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-rose-900 dark:text-rose-200 font-semibold">Processing failed</p>
                    <p className="text-rose-700 dark:text-rose-300/80 text-xs">{error}</p>
                  </div>
                </div>
              )}

              <div className="mt-auto pt-2">
                <button
                  type="button"
                  onClick={() => void handleProcess()}
                  disabled={isProcessing}
                  className="w-full bg-[#659287] dark:bg-[#2B5748] hover:opacity-95 text-white dark:text-[#9CB080] font-semibold px-5 py-2.5 rounded-xl text-sm shadow-sm transition-all cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing…</span>
                    </>
                  ) : state === 'error' ? (
                    <span>Retry</span>
                  ) : (
                    <span>Process document</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[var(--bg-card)]/90 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 animate-spin text-[#659287] dark:text-[#9CB080]" />
            <p className="text-sm font-semibold text-[var(--text-main)]">Running pipeline…</p>
          </div>
        )}
      </div>
    </div>
  )
}
