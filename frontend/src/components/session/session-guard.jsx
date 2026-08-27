import { useCallback, useState } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { useIdleSession } from '../../hooks/use-idle-session'
import { SessionTimeoutDialog } from './session-timeout-dialog'

/**
 * Runs the idle timer for an authenticated session and shows the countdown.
 * Rendered inside the protected area so the timer never runs on public pages.
 */
export function SessionGuard({ children }) {
  const { isAuthenticated, sessionConfig, expireSession, refreshSession, logout } = useAuth()
  const [extending, setExtending] = useState(false)

  const handleExpire = useCallback(() => {
    void expireSession()
  }, [expireSession])

  const { secondsLeft, extend } = useIdleSession({
    idleSeconds: sessionConfig.idleSeconds,
    warningSeconds: sessionConfig.warningSeconds,
    onExpire: handleExpire,
    enabled: isAuthenticated,
  })

  // "Extend" mints a fresh access token as well as restarting the clock, so the
  // token's own expiry cannot cut the extended session short.
  const handleExtend = async () => {
    setExtending(true)
    try {
      await refreshSession()
      extend()
    } catch {
      // Refresh token is gone or rejected; nothing left to extend.
      void expireSession()
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
