const express = require('express')
const bcrypt = require('bcryptjs')
const { z } = require('zod')
const { signupSchema, loginSchema } = require('../validators/auth')
const { responseEnvelope } = require('../utils/response')

function createAuthRouter({
  store,
  authService,
  authLimiter,
  protectedLimiter,
  authMiddleware,
}) {
  const router = express.Router()

  router.post('/signup', authLimiter, async (req, res) => {
    try {
      // debug: incoming signup
      // eslint-disable-next-line no-console
      console.log('[auth] signup request received')
      const payload = signupSchema.parse(req.body)
      // eslint-disable-next-line no-console
      console.log('[auth] payload validated for', payload.email)
      const passwordHash = await bcrypt.hash(payload.password, 12)
      // eslint-disable-next-line no-console
      console.log('[auth] password hashed')
      const user = await store.createUser({
        name: payload.name.trim(),
        email: payload.email,
        passwordHash,
      })

      // eslint-disable-next-line no-console
      console.log('[auth] store.createUser returned', user && user.id)

      if (!user) {
        return res.status(409).json(
          responseEnvelope(null, {
            code: 'EMAIL_IN_USE',
            message: 'An account with this email already exists.',
          }),
        )
      }

      const accessToken = authService.issueAccessToken(user)
      const refreshToken = authService.issueRefreshToken(user)
      await store.storeRefreshToken({ userId: user.id, token: refreshToken })
      authService.setCsrfCookie(res, authService.issueCsrfToken())
      authService.setRefreshCookie(res, refreshToken)

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

      const accessToken = authService.issueAccessToken(user)
      const refreshToken = authService.issueRefreshToken(user)
      await store.storeRefreshToken({ userId: user.id, token: refreshToken })
      authService.setCsrfCookie(res, authService.issueCsrfToken())
      authService.setRefreshCookie(res, refreshToken)

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

      const nextAccessToken = authService.issueAccessToken(user)
      const nextRefreshToken = authService.issueRefreshToken(user)
      authService.setCsrfCookie(res, authService.issueCsrfToken())
      await store.rotateRefreshToken({
        oldToken: currentRefreshToken,
        newToken: nextRefreshToken,
        userId: user.id,
      })
      authService.setRefreshCookie(res, nextRefreshToken)

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
      authService.clearRefreshCookie(res)
      return res.status(401).json(
        responseEnvelope(null, {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired refresh token',
        }),
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
      await store.revokeRefreshToken(currentRefreshToken)
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
