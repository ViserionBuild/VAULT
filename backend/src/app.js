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
const { createProfileRouter } = require('./routes/profile.routes')
const { createWorkspacesRouter } = require('./routes/workspaces.routes')
const { createItemsRouter } = require('./routes/items.routes')
const { createNotesRouter } = require('./routes/notes.routes')
const { createTagsRouter } = require('./routes/tags.routes')
const { createTodosRouter } = require('./routes/todos.routes')
const { responseEnvelope } = require('./utils/response')

function createApp(options = {}) {
  const app = express()
  const store = options.store ?? createSupabaseStore()

  const jwtSecret = options.jwtSecret ?? process.env.JWT_SECRET ?? 'development-jwt-secret'
  const refreshTokenSecret =
    options.refreshTokenSecret ?? process.env.JWT_REFRESH_SECRET ?? 'development-refresh-secret'
  const cookieEncryptionSecret = process.env.COOKIE_ENCRYPTION_SECRET ?? refreshTokenSecret

  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(
    cors({
      origin: (origin, callback) => {
        // Requests without an Origin header (curl, server-to-server) are not
        // subject to CORS, so let them through.
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true)
        }
        return callback(new Error(`Origin ${origin} is not allowed by CORS`))
      },
      credentials: true,
    }),
  )
  // Raised from the 100kb default: profile avatars are sent as inline data
  // URIs, which exceed it. Still small enough to bound request size.
  app.use(express.json({ limit: '1mb' }))
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
  app.use(
    '/api/v1/profile',
    createProfileRouter({ store, authMiddleware, protectedLimiter }),
  )
  app.use('/api/v1/workspaces', createWorkspacesRouter({ store, authMiddleware }))
  app.use('/api/v1/items', createItemsRouter({ store, authMiddleware }))
  app.use('/api/v1/notes', createNotesRouter({ store, authMiddleware }))
  app.use('/api/v1/todo', createTodosRouter({ store, authMiddleware }))
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
