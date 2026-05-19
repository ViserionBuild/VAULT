import { createContext, useContext, useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'

const AuthContext = createContext(null)
const TOKEN_KEY = 'vault-access-token'
const USER_KEY = 'vault-user'

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  const persistSession = ({ accessToken: nextToken, user: nextUser }) => {
    localStorage.setItem(TOKEN_KEY, nextToken)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setAccessToken(nextToken)
    setUser(nextUser)
  }

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setAccessToken(null)
    setUser(null)
  }

  const login = async (email, password) => {
    setLoading(true)
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      persistSession(data)
    } finally {
      setLoading(false)
    }
  }

  const signup = async (name, email, password) => {
    setLoading(true)
    try {
      const data = await apiRequest('/auth/signup', {
        method: 'POST',
        body: { name, email, password },
      })
      persistSession(data)
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    const data = await apiRequest('/auth/refresh', { method: 'POST' })
    persistSession(data)
  }

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } finally {
      clearSession()
    }
  }

  const getValidToken = async () => {
    if (accessToken) {
      return accessToken
    }

    try {
      await refreshSession()
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  }

  useEffect(() => {
    let cancelled = false

    const bootstrapSession = async () => {
      if (!accessToken) {
        // only attempt refresh if a refresh token cookie exists
        const hasRefresh = document.cookie.split('; ').some(c => c.startsWith('vault_refresh_token='))
        if (!hasRefresh) {
          if (!cancelled) setReady(true)
          return
        }

        try {
          await refreshSession()
        } catch {
          clearSession()
        } finally {
          if (!cancelled) setReady(true)
        }
        return
      }

      try {
        const me = await apiRequest('/auth/me', { token: accessToken })
        if (!cancelled && me?.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(me.user))
          setUser(me.user)
        }
      } catch (error) {
        try {
          await refreshSession()
        } catch {
          clearSession()
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    void bootstrapSession()

    return () => {
      cancelled = true
    }
    // bootstrap only once on mount; accessToken is intentionally read from the initial session state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = {
    user,
    accessToken,
    loading,
    ready,
    isAuthenticated: Boolean(accessToken && user),
    login,
    signup,
    logout,
    getValidToken,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
