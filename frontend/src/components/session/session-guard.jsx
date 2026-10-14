import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { useIdleSession } from '../../hooks/use-idle-session'
import { SessionTimeoutDialog } from './session-timeout-dialog'

// The server treats a session as abandoned after the idle window plus 90s of
// silence, so beating at most once a minute while active keeps it comfortably
// alive without a request per click.
const HEARTBEAT_INTERVAL_MS = 60_000

/**
 * Runs the idle timer for an authenticated session and shows the countdown.
 * Rendered inside the protected area so the timer never runs on public pages.
 */
export function SessionGuard({ children }) {
  const { isAuthenticated, sessionConfig, expireSession, refreshSession, logout, sendHeartbeat } =
    useAuth()
  const [extending, setExtending] = useState(false)
  const lastHeartbeatRef = useRef(0)

  const handleActivity = useCallback(() => {
    const now = Date.now()
    if (now - lastHeartbeatRef.current < HEARTBEAT_INTERVAL_MS) return
    lastHeartbeatRef.current = now
    void sendHeartbeat()
  }, [sendHeartbeat])

  // Beat once on entry so a session ended elsewhere is caught right away.
  useEffect(() => {
    if (isAuthenticated) handleActivity()
  }, [isAuthenticated, handleActivity])

  const handleExpire = useCallback(() => {
    void expireSession()
  }, [expireSession])

  const { secondsLeft, extend } = useIdleSession({
    idleSeconds: sessionConfig.idleSeconds,
    warningSeconds: sessionConfig.warningSeconds,
    onExpire: handleExpire,
    onActivity: handleActivity,
    enabled: isAuthenticated,
  })

  // "Extend" mints a fresh access token as well as restarting the clock, so the
  // token's own expiry cannot cut the extended session short. The clock restarts
  // first: a slow refresh (e.g. a cold server) must not let the countdown hit
  // zero while the user waits on the button.
  const handleExtend = async () => {
    extend()
    setExtending(true)
    try {
      await refreshSession()
    } catch (error) {
      // Only a rejected refresh token means there is nothing left to extend. A
      // network blip is retried by authedRequest on the next 401.
      if (error.status === 401 || error.status === 403) void expireSession()
    } finally {
      setExtending(false)
    }
  }

  return (
    <>
      {children}
      <SessionTimeoutDialog
        secondsLeft={secondsLeft}
        totalSeconds={sessionConfig.warningSeconds}
        onExtend={handleExtend}
        onLogout={() => void logout()}
        extending={extending}
      />
    </>
  )
}
