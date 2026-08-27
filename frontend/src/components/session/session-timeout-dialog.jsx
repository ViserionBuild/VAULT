import { ShieldAlert } from 'lucide-react'
import { Button } from '../ui/button'

/**
 * Countdown shown shortly before an idle session expires.
 *
 * Deliberately not the shared <Dialog>: that closes on Escape and on overlay
 * click, and dismissing this one without a decision would leave the user
 * watching an invisible timer run out.
 */
export function SessionTimeoutDialog({ secondsLeft, totalSeconds, onExtend, onLogout, extending }) {
  if (secondsLeft === null || secondsLeft === undefined) return null

  const pct = totalSeconds > 0 ? Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100)) : 0
  const urgent = secondsLeft <= 10

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-2xl sm:p-6">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              urgent ? 'bg-red-500/15 text-red-500' : 'bg-yellow-500/15 text-yellow-500'
            }`}
          >
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="session-timeout-title" className="text-lg font-semibold">
              Session is about to end
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You have been inactive. For your security you will be signed out automatically.
            </p>
          </div>
        </div>

        {/* aria-live so screen readers announce the countdown without stealing focus */}
        <div className="mt-5 text-center" aria-live="assertive" aria-atomic="true">
          <div
            className={`text-5xl font-bold tabular-nums transition-colors ${
              urgent ? 'text-red-500' : 'text-foreground'
            }`}
          >
            {secondsLeft}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {secondsLeft === 1 ? 'second remaining' : 'seconds remaining'}
          </div>
        </div>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-[width] duration-200 ease-linear ${
              urgent ? 'bg-red-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-6 flex gap-2">
          <Button className="flex-1" onClick={onExtend} disabled={extending} autoFocus>
            {extending ? 'Extending…' : 'Stay signed in'}
          </Button>
          <Button variant="outline" onClick={onLogout} disabled={extending}>
            Sign out now
          </Button>
        </div>
      </div>
    </div>
  )
}
