const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')

const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60

function createAuthService({ jwtSecret, refreshTokenSecret, cookieEncryptionSecret, nodeEnv }) {
  const encryptionKey = crypto.createHash('sha256').update(cookieEncryptionSecret).digest()
  const secureCookies = nodeEnv === 'production'
  const authCookiePath = '/api/v1/auth'
  const csrfCookiePath = '/'

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

  const setRefreshCookie = (res, token) => {
    res.cookie('vault_refresh_token', encryptCookieValue(token), {
      httpOnly: true,
      sameSite: 'strict',
      secure: secureCookies,
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
      path: authCookiePath,
    })
  }

  const setCsrfCookie = (res, token) => {
    res.cookie('vault_csrf_token', token, {
      httpOnly: false,
      sameSite: 'strict',
      secure: secureCookies,
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
      path: csrfCookiePath,
    })
  }

  const clearRefreshCookie = (res) => {
    res.clearCookie('vault_refresh_token', { path: authCookiePath })
    res.clearCookie('vault_csrf_token', { path: csrfCookiePath })
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
  }
}

module.exports = {
  createAuthService,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL_SECONDS,
}
