import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { apiRequest, setCsrfToken } from '../lib/api'

const AuthContext = createContext(null)
const TOKEN_KEY = 'vault-access-token'
const USER_KEY = 'vault-user'
// Why the session ended, written before the token is removed so other tabs
// can show the same notice when they follow it to the login page.
const END_REASON_KEY = 'vault-session-end-reason'

// Used only until the server's real values arrive from /auth/session-config.
const FALLBACK_SESSION_CONFIG = { idleSeconds: 300, warningSeconds: 60 }

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

  const persistSession = ({ accessToken: nextToken, user: nextUser, csrfToken }) => {
    setCsrfToken(csrfToken)
    localStorage.removeItem(END_REASON_KEY)
    // User before token: other tabs react to the token key and read the user.
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    localStorage.setItem(TOKEN_KEY, nextToken)
    setAccessToken(nextToken)
    setUser(nextUser)
  }

  // `reason` ('idle' | 'ended') is shown on the login page, here and in every
  // other open tab.
  const clearSession = (reason) => {
    setCsrfToken(null)
    if (reason) {
      localStorage.setItem(END_REASON_KEY, reason)
      setExpiredNotice(reason)
    } else {
      localStorage.removeItem(END_REASON_KEY)
    }
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(TOKEN_KEY)
    setAccessToken(null)
    setUser(null)
  }

  // Keep every tab on the same session: when one tab signs out (idle expiry,
  // logout, or ended elsewhere) the others drop to the login page too, and a
  // sign-in or token refresh in one tab is picked up by the rest.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== TOKEN_KEY) return

      if (event.newValue) {
        const raw = localStorage.getItem(USER_KEY)
        setAccessToken(event.newValue)
        setUser(raw ? JSON.parse(raw) : null)
        setExpiredNotice(false)
        return
      }

      setAccessToken(null)
      setUser(null)
      setExpiredNotice(localStorage.getItem(END_REASON_KEY) || false)
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

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

  // Coalesces concurrent refreshes: several requests can 401 at once, and
  // each rotating the refresh token in turn would invalidate the others.
  const refreshPromiseRef = useRef(null)

  const refreshOnce = useCallback(async () => {
    if (!refreshPromiseRef.current) {
      const tokenBefore = localStorage.getItem(TOKEN_KEY)
      refreshPromiseRef.current = apiRequest('/auth/refresh', { method: 'POST' })
        .then((data) => {
          persistSession(data)
          return data.accessToken
        })
        .catch((error) => {
          // Another tab refreshed at the same moment: it rotated the cookie, so
          // ours was rejected, but its new token is already shared here. Use it
          // rather than signing every tab out.
          const tokenNow = localStorage.getItem(TOKEN_KEY)
          if (tokenNow && tokenNow !== tokenBefore) return tokenNow
          throw error
        })
        .finally(() => {
          refreshPromiseRef.current = null
        })
    }
    return refreshPromiseRef.current
  }, [])

  const refreshSession = async () => {
    await refreshOnce()
  }

  // Clears local state at once so the UI locks immediately, even if the server
  // is slow to wake. The logout request is started first: apiRequest reads the
  // CSRF token when called, and clearSession erases it. Without it the logout
  // is rejected, the session is never revoked, and it still counts toward the
  // device limit when the user signs straight back in.
  const endSession = useCallback(async (reason) => {
    const revoke = apiRequest('/auth/logout', { method: 'POST' })
    clearSession(reason)
    try {
      await revoke
    } catch {
      // Unrevoked sessions go stale server-side shortly anyway.
    }
  }, [])

  const logout = useCallback(() => endSession(), [endSession])
  const expireSession = useCallback(() => endSession('idle'), [endSession])

  // Records activity server-side so the session isn't treated as abandoned,
  // and signs out immediately if it was ended on another device.
  const sendHeartbeat = useCallback(async () => {
    const beat = () => apiRequest('/auth/heartbeat', { method: 'POST' })
    try {
      await beat()
    } catch (error) {
      if (error.status !== 401) return // Cold server or network blip; next beat retries.

      // A refresh running at the same time rotates the cookie and revokes the
      // token this beat carried. Retry once with the new cookie before
      // concluding the session was really ended.
      try {
        await refreshPromiseRef.current?.catch(() => {})
        await beat()
      } catch (retryError) {
        if (retryError.status === 401) {
          clearSession('ended')
        }
      }
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
            clearSession('ended')
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
      } catch (meError) {
        // Only an auth rejection ends the session. A cold or unreachable server
        // must not log the user out; later requests retry on their own.
        if (meError.status === 401) {
          try {
            await refreshSession()
          } catch (refreshError) {
            if (refreshError.status === 401 || refreshError.status === 403) clearSession()
          }
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
    sendHeartbeat,
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
