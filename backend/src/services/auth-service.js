const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')

// Session lifetimes are configuration, not constants. SESSION_IDLE_SECONDS is
// the bank-style idle window: the frontend counts down against it and logs out
// when it reaches zero. The access token is issued with a matching TTL so a
// stolen token cannot outlive the visible session.
function readSeconds(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    // eslint-disable-next-line no-console
    console.warn(`[auth] ${name}="${raw}" is not a positive number; using ${fallback}s`)
    return fallback
  }
  return Math.floor(parsed)
}

const SESSION_IDLE_SECONDS = readSeconds('SESSION_IDLE_SECONDS', 5 * 60)
const SESSION_WARNING_SECONDS = Math.min(
  readSeconds('SESSION_WARNING_SECONDS', 60),
  // A warning longer than the session itself would show immediately on login.
  Math.max(SESSION_IDLE_SECONDS - 5, 5),
)

// Small grace period so a refresh fired at T-0 is not rejected by clock skew.
// Maximum concurrent sessions (refresh tokens) per account. 0 disables the
// limit entirely.
const MAX_CONCURRENT_SESSIONS = (() => {
  const raw = process.env.MAX_CONCURRENT_SESSIONS
  if (raw === undefined || raw === '') return 2
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) {
    // eslint-disable-next-line no-console
    console.warn(`[auth] MAX_CONCURRENT_SESSIONS="${raw}" is invalid; using 2`)
    return 2
  }
  return Math.floor(parsed)
})()

const ACCESS_TOKEN_TTL = SESSION_IDLE_SECONDS + 30

// A session untouched for longer than the idle window (plus grace for the
// client's heartbeat interval and clock skew) was abandoned, e.g. a tab closed
// without logging out. It can no longer be refreshed and stops counting toward
// MAX_CONCURRENT_SESSIONS, so forgotten devices don't lock the account out.
const SESSION_STALE_SECONDS = SESSION_IDLE_SECONDS + 90
const REFRESH_TOKEN_TTL_SECONDS = readSeconds('REFRESH_TOKEN_TTL_SECONDS', 7 * 24 * 60 * 60)

function createAuthService({ jwtSecret, refreshTokenSecret, cookieEncryptionSecret, nodeEnv }) {
  const encryptionKey = crypto.createHash('sha256').update(cookieEncryptionSecret).digest()
  const secureCookies = nodeEnv === 'production'
  const authCookiePath = '/api/v1/auth'
  const csrfCookiePath = '/'
  // Frontend and API live on different sites in production, so cookies must be
  // SameSite=None (which browsers only accept together with Secure).
  const sameSite = secureCookies ? 'none' : 'strict'

  const encryptCookieValue = (value) => {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv)
    const encryptedValue = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encryptedValue.toString('base64url')}`
  }

  const decryptCookieValue = (value) => {
    const [ivRaw, authTagRaw, encryptedRaw] = String(value).split('.')
    if (!ivRaw || !authTagRaw || !encryptedRaw) {
      return null
    }

    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        encryptionKey,
        Buffer.from(ivRaw, 'base64url'),
      )
      decipher.setAuthTag(Buffer.from(authTagRaw, 'base64url'))
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedRaw, 'base64url')),
        decipher.final(),
      ])
      return decrypted.toString('utf8')
    } catch {
      return null
    }
  }

  const issueCsrfToken = () => crypto.randomBytes(16).toString('hex')

  const issueAccessToken = (user) =>
    jwt.sign({ sub: user.id, email: user.email, name: user.name }, jwtSecret, {
      expiresIn: ACCESS_TOKEN_TTL,
    })

  const issueRefreshToken = (user) =>
    jwt.sign({ sub: user.id, tokenType: 'refresh' }, refreshTokenSecret, {
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    })

  const verifyRefreshToken = (token) => jwt.verify(token, refreshTokenSecret)

  const verifyAccessToken = (token) => {
    const payload = jwt.verify(token, jwtSecret)
    // Reject anything minted for a different purpose.
    if (payload.tokenType) {
      throw new Error('Invalid token type')
    }
    return payload
  }

  // Issued only after a correct password, when login is blocked by the session
  // limit. Scoped by purpose and short-lived: it authorizes listing and ending
  // that user's own sessions, and nothing else.
  const SESSION_MGMT_TTL_SECONDS = 120

  const issueSessionManagementToken = (user) =>
    jwt.sign({ sub: user.id, tokenType: 'session-management' }, jwtSecret, {
      expiresIn: SESSION_MGMT_TTL_SECONDS,
    })

  const verifySessionManagementToken = (token) => {
    const payload = jwt.verify(token, jwtSecret)
    // An access token must not be usable here and vice versa.
    if (payload.tokenType !== 'session-management') {
      throw new Error('Invalid token type')
    }
    return payload
  }

  const setRefreshCookie = (res, token) => {
    res.cookie('vault_refresh_token', encryptCookieValue(token), {
      httpOnly: true,
      sameSite,
      secure: secureCookies,
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
      path: authCookiePath,
    })
  }

  const setCsrfCookie = (res, token) => {
    res.cookie('vault_csrf_token', token, {
      httpOnly: false,
      sameSite,
      secure: secureCookies,
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
      path: csrfCookiePath,
    })
  }

  const clearRefreshCookie = (res) => {
    res.clearCookie('vault_refresh_token', { path: authCookiePath, sameSite, secure: secureCookies })
    res.clearCookie('vault_csrf_token', { path: csrfCookiePath, sameSite, secure: secureCookies })
  }

  const validateCsrf = (req) =>
    req.cookies?.vault_csrf_token && req.cookies.vault_csrf_token === req.headers['x-csrf-token']

  return {
    issueAccessToken,
    issueRefreshToken,
    issueCsrfToken,
    verifyRefreshToken,
    setRefreshCookie,
    setCsrfCookie,
    clearRefreshCookie,
    validateCsrf,
    decryptCookieValue,
    issueSessionManagementToken,
    verifySessionManagementToken,
    verifyAccessToken,
  }
}

module.exports = {
  createAuthService,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL_SECONDS,
  SESSION_IDLE_SECONDS,
  SESSION_WARNING_SECONDS,
  SESSION_STALE_SECONDS,
  MAX_CONCURRENT_SESSIONS,
}
