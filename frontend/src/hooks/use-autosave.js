import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Google-Docs-style autosave.
 *
 * Three rules keep this off the database:
 *  1. Debounce — a save fires only after typing pauses (default 1.2s).
 *  2. Skip unchanged content — the payload is compared to what was last saved.
 *  3. One in flight at a time — edits made during a save are coalesced into a
 *     single follow-up rather than queueing a request per keystroke.
 *
 * Status is exposed for the UI: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'.
 */
export function useAutosave({ onSave, delay = 1200, enabled = true }) {
  const [status, setStatus] = useState('idle')
  const [lastSavedAt, setLastSavedAt] = useState(null)

  const timerRef = useRef(null)
  const savingRef = useRef(false)
  const pendingRef = useRef(null)
  const lastSavedPayloadRef = useRef(null)
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  const runSaveRef = useRef(null)

  const runSave = useCallback(async (payload) => {
    // Nothing actually changed since the last successful write.
    if (lastSavedPayloadRef.current === JSON.stringify(payload)) {
      setStatus((prev) => (prev === 'unsaved' ? 'saved' : prev))
      return
    }

    if (savingRef.current) {
      // Coalesce: keep only the newest pending state.
      pendingRef.current = payload
      return
    }

    savingRef.current = true
    setStatus('saving')

    try {
      await onSaveRef.current(payload)
      lastSavedPayloadRef.current = JSON.stringify(payload)
      setLastSavedAt(new Date())
      setStatus('saved')
    } catch {
      setStatus('error')
    } finally {
      savingRef.current = false
      const queued = pendingRef.current
      pendingRef.current = null
      if (queued) void runSaveRef.current?.(queued)
    }
  }, [])

  // Assigned in an effect, not during render: runSave recurses through this
  // ref to drain a coalesced payload without referencing itself directly.
  useEffect(() => {
    runSaveRef.current = runSave
  }, [runSave])

  /** Call on every edit; scheduling is handled here. */
  const schedule = useCallback(
    (payload) => {
      if (!enabled) return
      setStatus('unsaved')
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => runSave(payload), delay)
    },
    [delay, enabled, runSave],
  )

  /** Force an immediate write — used on close and on Ctrl+S. */
  const flush = useCallback(
    async (payload) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      await runSave(payload)
    },
    [runSave],
  )

  /** Adopt server state as the baseline without writing. */
  const markClean = useCallback((payload) => {
    lastSavedPayloadRef.current = JSON.stringify(payload)
    setStatus('idle')
  }, [])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return { status, lastSavedAt, schedule, flush, markClean }
}
