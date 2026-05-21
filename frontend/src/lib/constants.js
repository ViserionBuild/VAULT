/**
 * ─── Session Constants ──────────────────────────────────────────
 * Adjust these values to control session timeout behaviour.
 *
 * SESSION_TIMEOUT_MS          – Must match the backend ACCESS_TOKEN_TTL.
 *                               When this duration elapses after login/refresh,
 *                               the session is considered expired.
 *
 * SESSION_WARNING_SECONDS     – How many seconds BEFORE expiry to start
 *                               showing the countdown notification (5 → 1).
 *
 * SESSION_REFRESH_BUFFER_MS   – Attempt a silent refresh this many ms
 *                               before the token actually expires.
 *                               Set to 0 to disable silent refresh.
 */

export const SESSION_TIMEOUT_MS = 15 * 60 * 1000        // 15 minutes (must match backend)
export const SESSION_WARNING_SECONDS = 5                 // countdown 5 → 1
export const SESSION_REFRESH_BUFFER_MS = 60 * 1000       // try refreshing 1 min before expiry
