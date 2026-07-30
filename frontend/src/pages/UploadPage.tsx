import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, FileText, Loader2, UploadCloud } from 'lucide-react'
import { uploadDocument } from '../lib/api'

type UploadState = 'idle' | 'dragging' | 'uploading' | 'error'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_MB = 4

export function UploadPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [filename, setFilename] = useState<string | null>(null)

  const processFile = useCallback(
    async (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Unsupported file type. Please upload PDF, JPEG, or PNG.`)
        setState('error')
        return
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`File exceeds ${MAX_MB} MB limit.`)
        setState('error')
        return
      }

      setFilename(file.name)
      setState('uploading')
      setError(null)

      try {
        const doc = await uploadDocument(file)
        navigate(`/documents/${doc.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.')
        setState('error')
      }
    },
    [navigate],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setState('idle')
      const file = e.dataTransfer.files[0]
      if (file) void processFile(file)
    },
    [processFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) void processFile(file)
    },
    [processFile],
  )

  const isUploading = state === 'uploading'
  const isDragging = state === 'dragging'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-main)]">
          Upload a Document
        </h1>
        <p className="text-[var(--text-muted)] text-sm">
          Invoice or receipt · PDF, JPEG, PNG · max {MAX_MB} MB
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setState('dragging') }}
        onDragLeave={() => setState('idle')}
        onDrop={handleDrop}
        className={`
          relative w-full max-w-lg rounded-2xl border-2 border-dashed p-12
          flex flex-col items-center gap-5 transition-all duration-200 cursor-pointer shadow-sm
          ${isDragging
            ? 'border-[#659287] dark:border-[#9CB080] bg-[#88BDA4]/20 dark:bg-[#2B5748]/60 scale-[1.01]'
            : isUploading
              ? 'border-[var(--border-color)] bg-[var(--bg-card)]'
              : 'border-[var(--border-accent)] bg-[var(--bg-card)] hover:border-[#659287] dark:hover:border-[#9CB080] hover:bg-[var(--bg-card-hover)]'
          }
        `}
        onClick={() => !isUploading && inputRef.current?.click()}
      >
        {/* Icon */}
        <div className="p-4 rounded-2xl bg-[#E6F2DD] dark:bg-[#273338] text-[#659287] dark:text-[#9CB080] transition-transform">
          {isUploading ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : isDragging ? (
            <UploadCloud className="w-10 h-10 scale-110 transition-transform" />
          ) : (
            <FileText className="w-10 h-10" />
          )}
        </div>

        {/* Status text */}
        {isUploading ? (
          <div className="text-center space-y-1">
            <p className="text-[var(--text-main)] font-semibold">Processing "{filename}"…</p>
            <p className="text-[var(--text-muted)] text-sm">Running extraction & validation pipeline</p>
            {/* Animated bar */}
            <div className="mt-4 w-48 h-1.5 rounded-full bg-[var(--border-color)] overflow-hidden mx-auto">
              <div className="h-full bg-[#659287] dark:bg-[#9CB080] animate-pulse rounded-full w-2/3" />
            </div>
          </div>
        ) : (
          <div className="text-center space-y-1">
            <p className="text-[var(--text-main)] font-semibold">
              {isDragging ? 'Drop file to process' : 'Drag & drop your file here'}
            </p>
            <p className="text-[var(--text-muted)] text-sm">or click to select file from disk</p>
          </div>
        )}

        {/* Hidden input */}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/jpeg,image/png"
          className="hidden"
          onChange={handleChange}
          disabled={isUploading}
        />
      </div>

      {/* Error state */}
      {state === 'error' && error && (
        <div className="w-full max-w-lg rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-rose-900 dark:text-rose-200 font-semibold">Upload Failed</p>
            <p className="text-rose-700 dark:text-rose-300/80">{error}</p>
            <button
              onClick={() => { setState('idle'); setError(null) }}
              className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-400 underline hover:opacity-80 cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Format hints */}
      <div className="flex gap-3 text-xs text-[var(--text-muted)]">
        {['PDF', 'JPEG', 'PNG'].map((fmt) => (
          <span key={fmt} className="rounded-md border border-[var(--border-color)] px-3 py-1 bg-[var(--bg-card)] font-medium">
            {fmt}
          </span>
        ))}
      </div>
    </div>
  )
}
