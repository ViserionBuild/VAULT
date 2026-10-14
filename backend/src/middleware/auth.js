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

// Access tokens carry their session id (sid). Checking the session on every
// request is what makes logout and "end this session" take effect at once
// rather than when the token expires. Results are cached briefly to avoid a
// query per request; logout and session revocation clear the entry
// immediately (invalidateSession), so the cache only delays revocations made
// by other server instances.
const SESSION_CACHE_TTL_MS = 10_000
const sessionCache = new Map()

async function isSessionLive(store, sessionId) {
  const key = String(sessionId)
  const cached = sessionCache.get(key)
  if (cached && Date.now() < cached.expiresAt) return cached.live
  const live = await store.isSessionActive(key)
  sessionCache.set(key, { live, expiresAt: Date.now() + SESSION_CACHE_TTL_MS })
  if (sessionCache.size > 5000) {
    for (const [k, entry] of sessionCache) if (Date.now() > entry.expiresAt) sessionCache.delete(k)
  }
  return live
}

function invalidateSession(sessionId) {
  if (sessionId) sessionCache.delete(String(sessionId))
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

      // Tokens issued before session ids existed have no sid; they simply run
      // out (minutes) instead of being checked.
      if (payload.sid && !(await isSessionLive(store, payload.sid))) {
        return res.status(401).json(
          responseEnvelope(null, {
            code: 'SESSION_ENDED',
            message: 'This session has ended',
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
  invalidateSession,
}
