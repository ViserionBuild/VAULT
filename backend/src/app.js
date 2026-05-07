const express = require('express')
const crypto = require('node:crypto')
const cors = require('cors')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const { z } = require('zod')
const { InMemoryStore } = require('./store')

const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email(),
  password: z.string().min(8).max(128),
})

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
})

function responseEnvelope(data, error, meta) {
  return {
    success: !error,
    data: data ?? null,
    error: error ?? null,
    meta: meta ?? null,
  }
}

function createApp(options = {}) {
  const app = express()
  const store = options.store ?? new InMemoryStore()

  const jwtSecret = options.jwtSecret ?? process.env.JWT_SECRET ?? 'development-jwt-secret'
  const refreshTokenSecret =
    options.refreshTokenSecret ?? process.env.JWT_REFRESH_SECRET ?? 'development-refresh-secret'
  const cookieEncryptionSecret = process.env.COOKIE_ENCRYPTION_SECRET ?? refreshTokenSecret

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'

  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(
    cors({
      origin: frontendUrl,
      credentials: true,
    }),
  )
  app.use(express.json())
  app.use(cookieParser())

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: responseEnvelope(null, {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please retry in a minute.',
    }),
  })
  const protectedLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })

  const encryptionKey = crypto.createHash('sha256').update(cookieEncryptionSecret).digest()

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

  const setRefreshCookie = (res, token) => {
    res.cookie('vault_refresh_token', encryptCookieValue(token), {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
      path: '/api/v1/auth',
    })
  }

  const setCsrfCookie = (res, token) => {
    res.cookie('vault_csrf_token', token, {
      httpOnly: false,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
      path: '/api/v1/auth',
    })
  }

  const clearRefreshCookie = (res) => {
    res.clearCookie('vault_refresh_token', { path: '/api/v1/auth' })
    res.clearCookie('vault_csrf_token', { path: '/api/v1/auth' })
  }

  const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json(
        responseEnvelope(null, {
          code: 'UNAUTHORIZED',
          message: 'Missing bearer token',
        }),
      )
    }

    try {
      const accessToken = authHeader.replace('Bearer ', '').trim()
      const payload = jwt.verify(accessToken, jwtSecret)
      const user = await store.findUserById(payload.sub)
      if (!user) {
        return res.status(401).json(
          responseEnvelope(null, {
            code: 'UNAUTHORIZED',
            message: 'User not found',
          }),
        )
      }

      req.user = user
      return next()
    } catch {
      return res.status(401).json(
        responseEnvelope(null, {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired access token',
        }),
      )
    }
  }

  app.get('/api/v1/health', (_req, res) => {
    res.json(
      responseEnvelope({
        status: 'ok',
        timestamp: new Date().toISOString(),
      }),
    )
  })

  app.post('/api/v1/auth/signup', authLimiter, async (req, res) => {
    try {
      const payload = signupSchema.parse(req.body)
      const passwordHash = await bcrypt.hash(payload.password, 12)
      const user = await store.createUser({
        name: payload.name.trim(),
        email: payload.email,
        passwordHash,
      })

      if (!user) {
        return res.status(409).json(
          responseEnvelope(null, {
            code: 'EMAIL_IN_USE',
            message: 'An account with this email already exists.',
          }),
        )
      }

      const accessToken = issueAccessToken(user)
      const refreshToken = issueRefreshToken(user)
      await store.storeRefreshToken({ userId: user.id, token: refreshToken })
      setCsrfCookie(res, issueCsrfToken())
      setRefreshCookie(res, refreshToken)

      return res.status(201).json(
        responseEnvelope({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          accessToken,
        }),
      )
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid signup payload',
            details: error.issues,
          }),
        )
      }

      return res.status(500).json(
        responseEnvelope(null, {
          code: 'INTERNAL_ERROR',
          message: 'Unable to create account',
        }),
      )
    }
  })

  app.post('/api/v1/auth/login', authLimiter, async (req, res) => {
    try {
      const payload = loginSchema.parse(req.body)
      const user = await store.findUserByEmail(payload.email)
      if (!user) {
        return res.status(401).json(
          responseEnvelope(null, {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          }),
        )
      }

      const validPassword = await bcrypt.compare(payload.password, user.passwordHash)
      if (!validPassword) {
        return res.status(401).json(
          responseEnvelope(null, {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          }),
        )
      }

      const accessToken = issueAccessToken(user)
      const refreshToken = issueRefreshToken(user)
      await store.storeRefreshToken({ userId: user.id, token: refreshToken })
      setCsrfCookie(res, issueCsrfToken())
      setRefreshCookie(res, refreshToken)

      return res.json(
        responseEnvelope({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          accessToken,
        }),
      )
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login payload',
            details: error.issues,
          }),
        )
      }

      return res.status(500).json(
        responseEnvelope(null, {
          code: 'INTERNAL_ERROR',
          message: 'Unable to login',
        }),
      )
    }
  })

  const validateCsrf = (req) => req.cookies?.vault_csrf_token && req.cookies.vault_csrf_token === req.headers['x-csrf-token']

  app.post('/api/v1/auth/refresh', protectedLimiter, async (req, res) => {
    if (!validateCsrf(req)) {
      clearRefreshCookie(res)
      return res.status(403).json(
        responseEnvelope(null, {
          code: 'FORBIDDEN',
          message: 'CSRF validation failed',
        }),
      )
    }

    const currentRefreshToken = decryptCookieValue(req.cookies?.vault_refresh_token)
    if (!currentRefreshToken) {
      return res.status(401).json(
        responseEnvelope(null, {
          code: 'UNAUTHORIZED',
          message: 'Missing refresh token',
        }),
      )
    }

    try {
      const payload = jwt.verify(currentRefreshToken, refreshTokenSecret)
      const tokenRecord = await store.findValidRefreshToken(currentRefreshToken)
      if (!tokenRecord) {
        clearRefreshCookie(res)
        return res.status(401).json(
          responseEnvelope(null, {
            code: 'UNAUTHORIZED',
            message: 'Invalid refresh token',
          }),
        )
      }

      const user = await store.findUserById(payload.sub)
      if (!user) {
        clearRefreshCookie(res)
        return res.status(401).json(
          responseEnvelope(null, {
            code: 'UNAUTHORIZED',
            message: 'User not found',
          }),
        )
      }

      const nextAccessToken = issueAccessToken(user)
      const nextRefreshToken = issueRefreshToken(user)
      setCsrfCookie(res, issueCsrfToken())
      await store.rotateRefreshToken({
        oldToken: currentRefreshToken,
        newToken: nextRefreshToken,
        userId: user.id,
      })
      setRefreshCookie(res, nextRefreshToken)

      return res.json(
        responseEnvelope({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          accessToken: nextAccessToken,
        }),
      )
    } catch {
      clearRefreshCookie(res)
      return res.status(401).json(
        responseEnvelope(null, {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired refresh token',
        }),
      )
    }
  })

  app.post('/api/v1/auth/logout', protectedLimiter, async (req, res) => {
    if (!validateCsrf(req)) {
      clearRefreshCookie(res)
      return res.status(403).json(
        responseEnvelope(null, {
          code: 'FORBIDDEN',
          message: 'CSRF validation failed',
        }),
      )
    }

    const currentRefreshToken = decryptCookieValue(req.cookies?.vault_refresh_token)

    if (currentRefreshToken) {
      await store.revokeRefreshToken(currentRefreshToken)
    }

    clearRefreshCookie(res)
    return res.json(
      responseEnvelope({
        message: 'Logged out successfully',
      }),
    )
  })

  app.get('/api/v1/auth/me', protectedLimiter, authMiddleware, (req, res) => {
    res.json(
      responseEnvelope({
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
        },
      }),
    )
  })

  app.use((error, _req, res, _next) => {
    return res.status(500).json(
      responseEnvelope(null, {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      }),
    )
  })

  return { app, store }
}

module.exports = {
  createApp,
}
