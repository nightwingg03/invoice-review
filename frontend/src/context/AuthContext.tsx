import React, { createContext, useContext, useState } from 'react'
import { apiBaseUrl } from '../lib/env'

interface AuthContextType {
  token: string | null
  isAuthenticated: boolean
  login: (password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('auth_token')
  })

  const login = async (password: string) => {
    const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed.' }))
      throw new Error(err.detail || 'Invalid password.')
    }

    const data = (await res.json()) as { token: string }
    setToken(data.token)
    localStorage.setItem('auth_token', data.token)
  }

  const logout = () => {
    setToken(null)
    localStorage.removeItem('auth_token')
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
