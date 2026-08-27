import { useState } from 'react'
import { Monitor, LogOut, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'

function relativeTime(iso) {
  if (!iso) return 'unknown'
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/**
 * Shown when login is refused because the account is at its device limit.
 * The user ends one of the listed sessions, then retries.
 */
export function ActiveSessionsDialog({
  open,
  sessions,
  activeCount,
  maxSessions,
  onEndSession,
  onCancel,
  onRetry,
}) {
  const [endingId, setEndingId] = useState(null)
  const [error, setError] = useState('')

  if (!open) return null

  const handleEnd = async (sessionId) => {
    setEndingId(sessionId)
    setError('')
    try {
      await onEndSession(sessionId)
    } catch (err) {
      setError(err?.message ?? 'Could not end that session.')
    } finally {
      setEndingId(null)
    }
  }

  const remaining = sessions.length
  const canRetry = remaining < maxSessions

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="active-sessions-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-background p-5 shadow-2xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-500">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="active-sessions-title" className="text-lg font-semibold">
              Already signed in on {activeCount} device{activeCount === 1 ? '' : 's'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This account allows {maxSessions} active session{maxSessions === 1 ? '' : 's'}.
              End one below to sign in here.
            </p>
          </div>
        </div>

        <ul className="mt-5 space-y-2 max-h-72 overflow-y-auto">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-center gap-3 rounded-lg border border-border p-3"
            >
              <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{session.device}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {session.ipAddress ? `${session.ipAddress} · ` : ''}
                  active {relativeTime(session.lastUsedAt ?? session.createdAt)}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEnd(session.id)}
                disabled={endingId !== null}
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                {endingId === session.id ? 'Ending…' : 'End'}
              </Button>
            </li>
          ))}
        </ul>

        {sessions.length === 0 && (
          <p className="mt-5 text-sm text-muted-foreground">
            All other sessions have ended. You can sign in now.
          </p>
        )}

        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button className="flex-1" onClick={onRetry} disabled={!canRetry}>
            {canRetry ? 'Sign in now' : `End ${remaining - maxSessions + 1} more to continue`}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
