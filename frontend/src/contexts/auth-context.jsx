import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../lib/api'

const AuthContext = createContext(null)
const TOKEN_KEY = 'vault-access-token'
const USER_KEY = 'vault-user'

// Used only until the server's real values arrive from /auth/session-config.
const FALLBACK_SESSION_CONFIG = { idleSeconds: 300, warningSeconds: 30 }

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [sessionConfig, setSessionConfig] = useState(FALLBACK_SESSION_CONFIG)
  const [expiredNotice, setExpiredNotice] = useState(false)

  // Session lengths are server-owned config; fetch them once on mount.
  useEffect(() => {
    let cancelled = false
    apiRequest('/auth/session-config')
      .then((cfg) => {
        if (!cancelled && cfg?.idleSeconds) setSessionConfig(cfg)
      })
      .catch(() => {
        // Keep the fallback; a missing config must not block the app.
      })
    return () => {
      cancelled = true
    }
  }, [])

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

  // Idle expiry. Clears local state first so the UI locks immediately even if
  // the network call is slow or fails.
  const expireSession = useCallback(async () => {
    clearSession()
    setExpiredNotice(true)
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } catch {
      // Cookie is cleared server-side on the next refresh attempt anyway.
    }
  }, [])

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

  // Coalesces concurrent refreshes: several requests can 401 at once, and
  // each rotating the refresh token in turn would invalidate the others.
  const refreshPromiseRef = useRef(null)

  const refreshOnce = useCallback(async () => {
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = apiRequest('/auth/refresh', { method: 'POST' })
        .then((data) => {
          persistSession(data)
          return data.accessToken
        })
        .finally(() => {
          refreshPromiseRef.current = null
        })
    }
    return refreshPromiseRef.current
  }, [])

  /**
   * Authenticated request that transparently recovers from an expired access
   * token: on a 401 it refreshes once and replays the original request. Without
   * this, every token expiry surfaces to the user as a failed request.
   */
  const authedRequest = useCallback(
    async (path, options = {}) => {
      const token = localStorage.getItem(TOKEN_KEY)

      try {
        return await apiRequest(path, { ...options, token })
      } catch (error) {
        if (error.status !== 401) throw error

        // Refresh and replay once. A second 401 means the refresh token is
        // gone too, so the session is genuinely over.
        try {
          const nextToken = await refreshOnce()
          return await apiRequest(path, { ...options, token: nextToken })
        } catch (refreshError) {
          if (refreshError.status === 401 || refreshError.status === 403) {
            clearSession()
            setExpiredNotice(true)
          }
          throw refreshError
        }
      }
    },
    [refreshOnce],
  )

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
      } catch {
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
    authedRequest,
    sessionConfig,
    expireSession,
    expiredNotice,
    clearExpiredNotice: () => setExpiredNotice(false),
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
