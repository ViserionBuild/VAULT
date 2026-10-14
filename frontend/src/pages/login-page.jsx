import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  Vault,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldAlert,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../contexts/auth-context'
import { Button } from '../components/ui/button'
import { ActiveSessionsDialog } from '../components/session/active-sessions-dialog'
import { apiRequest } from '../lib/api'

export function LoginPage() {
  const { login, loading, expiredNotice, clearExpiredNotice, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Held so the user can retry after ending a session without retyping.
  const [pendingCredentials, setPendingCredentials] = useState(null)
  const [sessionLimit, setSessionLimit] = useState(null)

  const attemptLogin = async (email, password) => {
    setError('')
    clearExpiredNotice()

    try {
      await login(email, password)
      setSessionLimit(null)
      navigate(location.state?.from?.pathname ?? '/')
    } catch (requestError) {
      if (requestError.code === 'SESSION_LIMIT_REACHED' && requestError.details) {
        setPendingCredentials({ email, password })
        setSessionLimit(requestError.details)
        return
      }
      setError(requestError.message)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    await attemptLogin(formData.get('email'), formData.get('password'))
  }

  // Authorized by the short-lived management token from the 409 response.
  const handleEndSession = async (sessionId) => {
    await apiRequest(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      token: sessionLimit.managementToken,
    })
    setSessionLimit((prev) =>
      prev
        ? {
            ...prev,
            sessions: prev.sessions.filter((s) => s.id !== sessionId),
            activeCount: prev.activeCount - 1,
          }
        : prev,
    )
  }

  const handleRetry = async () => {
    if (!pendingCredentials) return
    await attemptLogin(pendingCredentials.email, pendingCredentials.password)
  }

  const handleCancelSessionDialog = () => {
    setSessionLimit(null)
    setPendingCredentials(null)
  }

  // Signed in from another tab while this one sat on the login page.
  if (isAuthenticated && !sessionLimit) return <Navigate to="/" replace />

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Ambient background: layered radial tints, no external assets */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_50%_-10%,hsl(var(--primary)/0.16),transparent_70%),radial-gradient(40rem_30rem_at_10%_110%,hsl(var(--primary)/0.10),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(50rem_35rem_at_50%_40%,black,transparent)]"
      />

      <ActiveSessionsDialog
        open={sessionLimit !== null}
        sessions={sessionLimit?.sessions ?? []}
        activeCount={sessionLimit?.activeCount ?? 0}
        maxSessions={sessionLimit?.maxSessions ?? 0}
        onEndSession={handleEndSession}
        onCancel={handleCancelSessionDialog}
        onRetry={handleRetry}
      />

      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Vault className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your VAULT workspace
          </p>
        </div>

        <form
          className="space-y-4 rounded-2xl border border-border bg-background/80 p-6 shadow-xl backdrop-blur-sm"
          onSubmit={handleSubmit}
        >
          {expiredNotice ? (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {expiredNotice === 'idle'
                  ? 'Your session ended due to inactivity. Please sign in again.'
                  : 'Your session has ended. Please sign in again.'}
              </span>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                minLength={8}
                className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <Button className="h-11 w-full" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link className="font-medium text-primary hover:underline" to="/signup">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
