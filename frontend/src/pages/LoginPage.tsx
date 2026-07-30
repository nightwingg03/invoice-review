import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, KeyRound, Loader2, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setLoading(true)
    setError(null)

    try {
      await login(password.trim())
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] w-full px-4">
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-8 sm:p-10 shadow-lg space-y-6">
        
        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-4 rounded-2xl bg-[#E6F2DD] dark:bg-[#273338] text-[#659287] dark:text-[#9CB080] shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-main)]">
              Invoice Review Access
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              Enter application password to unlock the workspace
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3.5 flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200 font-semibold animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="app-password" className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Application Password
            </label>
            <div className="relative">
              <input
                id="app-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                required
                autoFocus
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] pl-10 pr-4 py-3 text-sm text-[var(--text-main)] focus:outline-hidden focus:border-[#659287] dark:focus:border-[#9CB080] transition-colors"
              />
              <KeyRound className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full bg-[#659287] dark:bg-[#2B5748] hover:opacity-95 text-white dark:text-[#9CB080] font-semibold py-3 rounded-xl text-sm shadow-sm transition-all cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Unlocking…</span>
              </>
            ) : (
              <span>Unlock Workspace</span>
            )}
          </button>
        </form>

      </div>
    </div>
  )
}
