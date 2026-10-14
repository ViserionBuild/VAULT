import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { cn } from '../../lib/utils'

const ToastContext = createContext(null)
const DEFAULT_DURATION_MS = 5000

/**
 * Small notification stack at the bottom of the screen. A toast may carry one
 * action (e.g. "Undo"); choosing it dismisses the toast.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    ({ message, variant = 'default', action, duration = DEFAULT_DURATION_MS }) => {
      const id = ++nextId.current
      setToasts((list) => [...list.slice(-2), { id, message, variant, action }])
      timers.current.set(id, setTimeout(() => dismiss(id), duration))
      return id
    },
    [dismiss],
  )

  const toast = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, opts) => show({ ...opts, message, variant: 'success' }),
      error: (message, opts) => show({ ...opts, message, variant: 'error' }),
    }),
    [show, dismiss],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Above the phone tab bar; bottom-centre on larger screens. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border bg-background px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-4',
              t.variant === 'error' ? 'border-red-500/40' : 'border-border',
            )}
          >
            {t.variant === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />}
            {t.variant === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />}
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="shrink-0 rounded-md px-2 py-1 font-semibold text-primary hover:bg-primary/10"
                onClick={() => {
                  dismiss(t.id)
                  t.action.onClick()
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => dismiss(t.id)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
