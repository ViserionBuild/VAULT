import { useCallback, useEffect, useRef, useState } from 'react'

// Activity that counts as "the user is still here".
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown']

// How often the countdown re-renders while the warning is visible.
const TICK_MS = 250

// Ignore activity bursts closer together than this, so we are not resetting
// the deadline on every pixel of a scroll.
const RESET_THROTTLE_MS = 1000

// Shared across tabs so activity in one tab keeps the others alive. Without
// this an idle background tab expires and its logout revokes the session the
// user is actively working in.
const DEADLINE_KEY = 'vault-idle-deadline'

function writeSharedDeadline(deadline) {
  try {
    localStorage.setItem(DEADLINE_KEY, String(deadline))
  } catch {
    // Storage unavailable; this tab still tracks its own deadline.
  }
}

/**
 * Bank-style idle session timer.
 *
 * The deadline is an absolute timestamp rather than a decremented counter:
 * browsers throttle timers in background tabs, so a counter would drift and
 * report time remaining that has already elapsed. Every tick recomputes from
 * Date.now(), which stays correct even if the tab was suspended.
 */
export function useIdleSession({ idleSeconds, warningSeconds, onExpire, onActivity, enabled }) {
  const [secondsLeft, setSecondsLeft] = useState(null)

  const deadlineRef = useRef(0)
  const lastResetRef = useRef(0)
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  const onActivityRef = useRef(onActivity)

  // Keep the latest callbacks without making them dependencies of the interval.
  useEffect(() => {
    onExpireRef.current = onExpire
    onActivityRef.current = onActivity
  }, [onExpire, onActivity])

  const resetDeadline = useCallback(() => {
    const now = Date.now()
    deadlineRef.current = now + idleSeconds * 1000
    lastResetRef.current = now
    writeSharedDeadline(deadlineRef.current)
  }, [idleSeconds])

  const extend = useCallback(() => {
    resetDeadline()
    setSecondsLeft(null)
  }, [resetDeadline])

  useEffect(() => {
    if (!enabled || !idleSeconds) return

    expiredRef.current = false
    resetDeadline()

    const tick = () => {
      if (expiredRef.current) return
      const remainingMs = deadlineRef.current - Date.now()

      if (remainingMs <= 0) {
        expiredRef.current = true
        setSecondsLeft(0)
        onExpireRef.current?.()
        return
      }

      if (remainingMs <= warningSeconds * 1000) {
        setSecondsLeft(Math.ceil(remainingMs / 1000))
      } else {
        setSecondsLeft((prev) => (prev === null ? prev : null))
      }
    }

    const handleActivity = () => {
      const now = Date.now()
      // Once the warning is up, only the explicit button may extend the
      // session. Otherwise an accidental scroll would silently dismiss it.
      if (now >= deadlineRef.current - warningSeconds * 1000) return
      if (now - lastResetRef.current < RESET_THROTTLE_MS) return
      resetDeadline()
      onActivityRef.current?.()
    }

    // Another tab saw activity or the user extended there: adopt its deadline,
    // which also dismisses this tab's warning on the next tick.
    const onStorage = (event) => {
      if (event.key !== DEADLINE_KEY || !event.newValue) return
      const shared = Number(event.newValue)
      if (shared > deadlineRef.current) {
        deadlineRef.current = shared
        tick()
      }
    }

    // Timers in hidden tabs can be delayed by up to a minute; recheck at once
    // when the tab comes back so an elapsed session locks immediately.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true }),
    )
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisibility)

    const interval = setInterval(tick, TICK_MS)

    return () => {
      clearInterval(interval)
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity))
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisibility)
      // Don't carry a stale countdown into the next session.
      setSecondsLeft(null)
    }
  }, [enabled, idleSeconds, warningSeconds, resetDeadline])

  // A disabled timer never shows a countdown, even one left over from before.
  const visibleSecondsLeft = enabled ? secondsLeft : null

  return {
    secondsLeft: visibleSecondsLeft,
    isWarning: visibleSecondsLeft !== null,
    extend,
  }
}
