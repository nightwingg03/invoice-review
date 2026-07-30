import { Link, useLocation } from 'react-router-dom'
import { FileCheck2, LogOut, Moon, Sun } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ThemeProvider, useTheme } from '../context/ThemeContext'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] transition-colors flex items-center justify-center cursor-pointer"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 text-[#659287]" />
      ) : (
        <Sun className="w-4 h-4 text-[#9CB080]" />
      )}
    </button>
  )
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { isAuthenticated, logout } = useAuth()

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] transition-colors duration-200">
      {/* Top nav */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-header)] backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex h-16 items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-bold tracking-tight text-lg text-[var(--text-main)] hover:opacity-90 transition-opacity"
          >
            <div className="p-1.5 rounded-lg bg-[#659287] dark:bg-[#2B5748] text-white dark:text-[#9CB080] shadow-sm">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <span>Invoice Review</span>
          </Link>

          <div className="flex items-center gap-6">
            {isAuthenticated && (
              <nav className="flex items-center gap-5 text-sm font-medium">
                <Link
                  to="/"
                  className={`transition-colors hover:text-[#659287] dark:hover:text-[#9CB080] ${
                    location.pathname === '/'
                      ? 'text-[#659287] dark:text-[#9CB080] font-semibold'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/history"
                  className={`transition-colors hover:text-[#659287] dark:hover:text-[#9CB080] ${
                    location.pathname.startsWith('/history') || location.pathname.startsWith('/documents')
                      ? 'text-[#659287] dark:text-[#9CB080] font-semibold'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  History
                </Link>
              </nav>
            )}

            <div className="flex items-center gap-2">
              <ThemeToggle />
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={logout}
                  className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center justify-center cursor-pointer"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col flex-1 min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LayoutContent>{children}</LayoutContent>
    </ThemeProvider>
  )
}
