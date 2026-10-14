const crypto = require('node:crypto')
const express = require('express')
const bcrypt = require('bcryptjs')
const { z } = require('zod')
const { signupSchema, loginSchema } = require('../validators/auth')
const {
  SESSION_IDLE_SECONDS,
  SESSION_WARNING_SECONDS,
  MAX_CONCURRENT_SESSIONS,
} = require('../services/auth-service')
const { describeDevice, clientIp } = require('../utils/device')
const { responseEnvelope } = require('../utils/response')
const { invalidateSession } = require('../middleware/auth')

// Mirrors the hashing in the store so a session row can be matched to the
// caller's own refresh cookie without ever storing the raw token.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

function createAuthRouter({
  store,
  authService,
  authLimiter,
  protectedLimiter,
  authMiddleware,
}) {
  const router = express.Router()

  // Public: the client needs these before it has a session in order to size
  // its idle timer and warning countdown. No user data is exposed.
  router.get('/session-config', (_req, res) => {
    res.json(
      responseEnvelope({
        idleSeconds: SESSION_IDLE_SECONDS,
        warningSeconds: SESSION_WARNING_SECONDS,
        maxConcurrentSessions: MAX_CONCURRENT_SESSIONS,
      }),
    )
  })

  // Resolves the caller from either a normal access token (managing sessions
  // while signed in) or a short-lived management token (login was blocked by
  // the limit, so no access token exists yet).
  const resolveSessionActor = (req) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) return null
    const token = header.slice(7)

    try {
      return authService.verifySessionManagementToken(token).sub
    } catch {
      // Not a management token; fall through to the normal access token.
    }

    try {
      const payload = authService.verifyAccessToken(token)
      return payload.sub
    } catch {
      return null
    }
  }

  router.get('/sessions', protectedLimiter, async (req, res) => {
    const userId = resolveSessionActor(req)
    if (!userId) {
      return res.status(401).json(
        responseEnvelope(null, { code: 'UNAUTHORIZED', message: 'Not authorized' }),
      )
    }

    try {
      const sessions = await store.listActiveSessions(userId)
      const currentToken = authService.decryptCookieValue(req.cookies?.vault_refresh_token)
      const currentHash = currentToken ? hashToken(currentToken) : null

      return res.json(
        responseEnvelope({
          maxSessions: MAX_CONCURRENT_SESSIONS,
          sessions: sessions.map((session) => ({
            id: session.id,
            device: describeDevice(session.user_agent),
            ipAddress: session.ip_address,
            createdAt: session.created_at,
            lastUsedAt: session.last_used_at,
            isCurrent: currentHash !== null && session.token_hash === currentHash,
          })),
        }),
      )
    } catch {
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Unable to list sessions' }),
      )
    }
  })

  router.delete('/sessions/:sessionId', protectedLimiter, async (req, res) => {
    const userId = resolveSessionActor(req)
    if (!userId) {
      return res.status(401).json(
        responseEnvelope(null, { code: 'UNAUTHORIZED', message: 'Not authorized' }),
      )
    }

    try {
      // Scoped by userId inside the store, so one account cannot end another's.
      const revoked = await store.revokeSessionById({
        sessionId: req.params.sessionId,
        userId,
      })
      // Its access tokens stop working now, not when they expire.
      invalidateSession(req.params.sessionId)

      if (!revoked) {
        return res.status(404).json(
          responseEnvelope(null, {
            code: 'NOT_FOUND',
            message: 'Session not found or already ended',
          }),
        )
      }

      return res.json(responseEnvelope({ ended: true }))
    } catch {
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Unable to end session' }),
      )
    }
  })

  router.post('/signup', authLimiter, async (req, res) => {
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

      const refreshToken = authService.issueRefreshToken(user)
      const sessionId = await store.storeRefreshToken({
        userId: user.id,
        token: refreshToken,
        userAgent: req.headers['user-agent'],
        ipAddress: clientIp(req),
      })
      const accessToken = authService.issueAccessToken(user, sessionId)
      // The frontend can't read this cookie cross-site, so the token is also
      // returned in the body for it to echo back in the x-csrf-token header.
      const csrfToken = authService.issueCsrfToken()
      authService.setCsrfCookie(res, csrfToken)
      authService.setRefreshCookie(res, refreshToken)

      return res.status(201).json(
        responseEnvelope({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          accessToken,
          csrfToken,
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

  router.post('/login', authLimiter, async (req, res) => {
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

        if (!user.passwordHash) {
          return res.status(401).json(
            responseEnvelope(null, {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            }),
          )
        }

        const validPassword = await bcrypt.compare(payload.password, user.passwordHash).catch(() => false)
      if (!validPassword) {
        return res.status(401).json(
          responseEnvelope(null, {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          }),
        )
      }

      // Concurrent-session limit. Enforced only after the password check, so
      // this never reveals whether an account exists or is currently in use.
      if (MAX_CONCURRENT_SESSIONS > 0) {
        const activeSessions = await store.listActiveSessions(user.id)

        if (activeSessions.length >= MAX_CONCURRENT_SESSIONS) {
          return res.status(409).json(
            responseEnvelope(null, {
              code: 'SESSION_LIMIT_REACHED',
              message:
                `This account is already signed in on ${activeSessions.length} ` +
                `device${activeSessions.length === 1 ? '' : 's'}. ` +
                'End one of them to continue.',
              details: {
                activeCount: activeSessions.length,
                maxSessions: MAX_CONCURRENT_SESSIONS,
                // A short-lived token scoped to this decision. Without it the
                // session list would be readable with only a password, and
                // revocation would need an access token we cannot issue yet.
                managementToken: authService.issueSessionManagementToken(user),
                sessions: activeSessions.map((session) => ({
                  id: session.id,
                  device: describeDevice(session.user_agent),
                  ipAddress: session.ip_address,
                  createdAt: session.created_at,
                  lastUsedAt: session.last_used_at,
                })),
              },
            }),
          )
        }
      }

      const refreshToken = authService.issueRefreshToken(user)
      const sessionId = await store.storeRefreshToken({
        userId: user.id,
        token: refreshToken,
        userAgent: req.headers['user-agent'],
        ipAddress: clientIp(req),
      })
      const accessToken = authService.issueAccessToken(user, sessionId)
      // The frontend can't read this cookie cross-site, so the token is also
      // returned in the body for it to echo back in the x-csrf-token header.
      const csrfToken = authService.issueCsrfToken()
      authService.setCsrfCookie(res, csrfToken)
      authService.setRefreshCookie(res, refreshToken)

      return res.json(
        responseEnvelope({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          accessToken,
          csrfToken,
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

  router.post('/refresh', protectedLimiter, async (req, res) => {
    if (!authService.validateCsrf(req)) {
      authService.clearRefreshCookie(res)
      return res.status(403).json(
        responseEnvelope(null, {
          code: 'FORBIDDEN',
          message: 'CSRF validation failed',
        }),
      )
    }

    const currentRefreshToken = authService.decryptCookieValue(req.cookies?.vault_refresh_token)
    if (!currentRefreshToken) {
      return res.status(401).json(
        responseEnvelope(null, {
          code: 'UNAUTHORIZED',
          message: 'Missing refresh token',
        }),
      )
    }

    try {
      const payload = authService.verifyRefreshToken(currentRefreshToken)
      const tokenRecord = await store.findValidRefreshToken(currentRefreshToken)
      if (!tokenRecord) {
        authService.clearRefreshCookie(res)
        return res.status(401).json(
          responseEnvelope(null, {
            code: 'UNAUTHORIZED',
            message: 'Invalid refresh token',
          }),
        )
      }

      const user = await store.findUserById(payload.sub)
      if (!user) {
        authService.clearRefreshCookie(res)
        return res.status(401).json(
          responseEnvelope(null, {
            code: 'UNAUTHORIZED',
            message: 'User not found',
          }),
        )
      }

      const nextRefreshToken = authService.issueRefreshToken(user)
      // The frontend can't read this cookie cross-site, so the token is also
      // returned in the body for it to echo back in the x-csrf-token header.
      const csrfToken = authService.issueCsrfToken()
      authService.setCsrfCookie(res, csrfToken)
      const sessionId = await store.rotateRefreshToken({
        userAgent: req.headers['user-agent'],
        ipAddress: clientIp(req),
        oldToken: currentRefreshToken,
        newToken: nextRefreshToken,
        userId: user.id,
      })
      const nextAccessToken = authService.issueAccessToken(user, sessionId)
      authService.setRefreshCookie(res, nextRefreshToken)

      return res.json(
        responseEnvelope({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          accessToken: nextAccessToken,
          csrfToken,
        }),
      )
    } catch {
      authService.clearRefreshCookie(res)
      return res.status(401).json(
        responseEnvelope(null, {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired refresh token',
        }),
      )
    }
  })

  // Sent by the client while the user is active. Keeps the session from going
  // stale between token refreshes, and tells a device whose session was ended
  // elsewhere (e.g. kicked from the session-limit picker) to sign out now
  // instead of when its access token expires.
  router.post('/heartbeat', protectedLimiter, async (req, res) => {
    if (!authService.validateCsrf(req)) {
      return res.status(403).json(
        responseEnvelope(null, {
          code: 'FORBIDDEN',
          message: 'CSRF validation failed',
        }),
      )
    }

    const currentRefreshToken = authService.decryptCookieValue(req.cookies?.vault_refresh_token)
    try {
      const live = currentRefreshToken
        ? await store.touchRefreshToken(currentRefreshToken)
        : false

      if (!live) {
        authService.clearRefreshCookie(res)
        return res.status(401).json(
          responseEnvelope(null, {
            code: 'SESSION_ENDED',
            message: 'This session has ended',
          }),
        )
      }

      return res.json(responseEnvelope({ active: true }))
    } catch {
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Unable to record activity' }),
      )
    }
  })

  router.post('/logout', protectedLimiter, async (req, res) => {
    if (!authService.validateCsrf(req)) {
      authService.clearRefreshCookie(res)
      return res.status(403).json(
        responseEnvelope(null, {
          code: 'FORBIDDEN',
          message: 'CSRF validation failed',
        }),
      )
    }

    const currentRefreshToken = authService.decryptCookieValue(req.cookies?.vault_refresh_token)

    if (currentRefreshToken) {
      // The session's access tokens stop working now, not when they expire.
      invalidateSession(await store.revokeRefreshToken(currentRefreshToken))
    }

    authService.clearRefreshCookie(res)
    return res.json(
      responseEnvelope({
        message: 'Logged out successfully',
      }),
    )
  })

  router.get('/me', protectedLimiter, authMiddleware, (req, res) => {
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

  return router
}

module.exports = {
  createAuthRouter,
}
