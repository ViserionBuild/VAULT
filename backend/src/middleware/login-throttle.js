// Per-account brute-force protection. The IP rate limiter alone lets an
// attacker spread guesses for one account across many IPs; this caps failed
// password attempts per email instead. Failures for emails that don't exist
// are counted the same way, so a lockout reveals nothing about which
// accounts exist.
//
// Kept in memory: correct for a single instance, and it resets on deploy.
// Multiple instances would need a shared store (e.g. a database table).

const MAX_FAILURES = 5
const WINDOW_MS = 15 * 60 * 1000
const LOCK_MS = 15 * 60 * 1000

function createLoginThrottle({ maxFailures = MAX_FAILURES, windowMs = WINDOW_MS, lockMs = LOCK_MS, now = Date.now } = {}) {
  const entries = new Map() // email -> { failures: number[], lockedUntil: number }

  const prune = (entry, at) => {
    entry.failures = entry.failures.filter((time) => at - time < windowMs)
  }

  return {
    // Milliseconds until the account may try again, or 0 if it isn't locked.
    lockedFor(email) {
      const entry = entries.get(email)
      if (!entry) return 0
      return Math.max(0, entry.lockedUntil - now())
    },

    recordFailure(email) {
      const at = now()
      const entry = entries.get(email) ?? { failures: [], lockedUntil: 0 }
      prune(entry, at)
      entry.failures.push(at)
      if (entry.failures.length >= maxFailures) {
        entry.lockedUntil = at + lockMs
        entry.failures = []
      }
      entries.set(email, entry)
      if (entries.size > 10000) {
        for (const [key, value] of entries) {
          prune(value, at)
          if (value.failures.length === 0 && value.lockedUntil <= at) entries.delete(key)
        }
      }
    },

    recordSuccess(email) {
      entries.delete(email)
    },
  }
}

module.exports = { createLoginThrottle }
