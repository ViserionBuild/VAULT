const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const { createSupabaseStore } = require('./db_service/supabase-store')
const { createAuthService } = require('./services/auth-service')
const { createAuthMiddleware } = require('./middleware/auth')
const { createAuthLimiter, createProtectedLimiter } = require('./middleware/rate-limits')
const { createHealthRouter } = require('./routes/health.routes')
const { createAuthRouter } = require('./routes/auth.routes')
const { createWorkspacesRouter } = require('./routes/workspaces.routes')
const { createItemsRouter } = require('./routes/items.routes')
const { createTagsRouter } = require('./routes/tags.routes')
const { responseEnvelope } = require('./utils/response')

function createApp(options = {}) {
  const app = express()
  const store = options.store ?? createSupabaseStore()

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

  const authLimiter = createAuthLimiter()
  const protectedLimiter = createProtectedLimiter()

  const authService = createAuthService({
    jwtSecret,
    refreshTokenSecret,
    cookieEncryptionSecret,
    nodeEnv: process.env.NODE_ENV,
  })

  const authMiddleware = createAuthMiddleware({ store, jwtSecret })

  app.use('/api/v1/health', createHealthRouter())
  app.use(
    '/api/v1/auth',
    createAuthRouter({
      store,
      authService,
      authLimiter,
      protectedLimiter,
      authMiddleware,
    }),
  )
  app.use('/api/v1/workspaces', createWorkspacesRouter({ store, authMiddleware }))
  app.use('/api/v1/items', createItemsRouter({ store, authMiddleware }))
  app.use('/api/v1/tags', createTagsRouter({ store, authMiddleware }))

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
