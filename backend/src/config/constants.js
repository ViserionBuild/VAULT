/**
 * ─── Session & Token Constants ──────────────────────────────────
 * Adjust these values to change session duration across the app.
 *
 * ACCESS_TOKEN_TTL  – JWT access-token lifetime (ms-style string for jsonwebtoken)
 * REFRESH_TOKEN_TTL_SECONDS – Refresh-token lifetime in **seconds**
 */

const ACCESS_TOKEN_TTL = '15m'                 // e.g. '15m', '1h', '30m'
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60  // 7 days

module.exports = {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL_SECONDS,
}
