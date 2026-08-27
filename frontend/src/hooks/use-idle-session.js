import { useCallback, useEffect, useRef, useState } from 'react'

// Activity that counts as "the user is still here".
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown']

// How often the countdown re-renders while the warning is visible.
const TICK_MS = 250

// Ignore activity bursts closer together than this, so we are not resetting
// the deadline on every pixel of a scroll.
const RESET_THROTTLE_MS = 1000

/**
 * Bank-style idle session timer.
 *
 * The deadline is an absolute timestamp rather than a decremented counter:
 * browsers throttle timers in background tabs, so a counter would drift and
 * report time remaining that has already elapsed. Every tick recomputes from
 * Date.now(), which stays correct even if the tab was suspended.
 */
export function useIdleSession({ idleSeconds, warningSeconds, onExpire, enabled }) {
  const [secondsLeft, setSecondsLeft] = useState(null)

  const deadlineRef = useRef(0)
  const lastResetRef = useRef(0)
  const onExpireRef = useRef(onExpire)

  // Keep the latest callback without making it a dependency of the interval.
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  const extend = useCallback(() => {
    deadlineRef.current = Date.now() + idleSeconds * 1000
    lastResetRef.current = Date.now()
    setSecondsLeft(null)
  }, [idleSeconds])

  useEffect(() => {
    if (!enabled || !idleSeconds) {
      setSecondsLeft(null)
      return
    }

    deadlineRef.current = Date.now() + idleSeconds * 1000
    lastResetRef.current = Date.now()

    const onActivity = () => {
      const now = Date.now()
      // Once the warning is up, only the explicit button may extend the
      // session. Otherwise an accidental scroll would silently dismiss it.
      if (now >= deadlineRef.current - warningSeconds * 1000) return
      if (now - lastResetRef.current < RESET_THROTTLE_MS) return
      lastResetRef.current = now
      deadlineRef.current = now + idleSeconds * 1000
    }

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true }),
    )

    const interval = setInterval(() => {
      const remainingMs = deadlineRef.current - Date.now()

      if (remainingMs <= 0) {
        setSecondsLeft(0)
        onExpireRef.current?.()
        return
      }

      if (remainingMs <= warningSeconds * 1000) {
        setSecondsLeft(Math.ceil(remainingMs / 1000))
      } else {
        setSecondsLeft((prev) => (prev === null ? prev : null))
      }
    }, TICK_MS)

    return () => {
      clearInterval(interval)
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity))
    }
  }, [enabled, idleSeconds, warningSeconds])

  return {
    secondsLeft,
    isWarning: secondsLeft !== null,
    extend,
  }
}
