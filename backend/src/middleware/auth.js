const jwt = require('jsonwebtoken')
const { responseEnvelope } = require('../utils/response')

// Every authenticated request re-fetched the user, adding a full database
// round trip (~200ms against a remote instance) to every endpoint. The JWT is
// already cryptographically verified above; this lookup only confirms the user
// still exists, so a short TTL is a safe trade. Deleting a user takes effect
// within USER_CACHE_TTL_MS rather than instantly.
const USER_CACHE_TTL_MS = 30_000
const userCache = new Map()

function getCachedUser(userId) {
  const entry = userCache.get(userId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    userCache.delete(userId)
    return null
  }
  return entry.user
}

function setCachedUser(userId, user) {
  userCache.set(userId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS })
  // Bound the map so a long-lived process cannot grow it without limit.
  if (userCache.size > 1000) {
    for (const [key, entry] of userCache) {
      if (Date.now() > entry.expiresAt) userCache.delete(key)
    }
  }
}

// Exported so logout/delete paths can drop a user immediately if needed.
function invalidateCachedUser(userId) {
  userCache.delete(String(userId))
}

function createAuthMiddleware({ store, jwtSecret }) {
  return async (req, res, next) => {
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

      // Reject tokens minted for a narrower purpose. The session-management
      // token is issued on a BLOCKED login, before the user holds a session,
      // so it must never authorize data access.
      if (payload.tokenType) {
        return res.status(401).json(
          responseEnvelope(null, {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired access token',
          }),
        )
      }

      let user = getCachedUser(payload.sub)
      if (!user) {
        user = await store.findUserById(payload.sub)
        if (user) setCachedUser(payload.sub, user)
      }

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
}

module.exports = {
  createAuthMiddleware,
  invalidateCachedUser,
}
