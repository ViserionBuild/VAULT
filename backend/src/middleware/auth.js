const jwt = require('jsonwebtoken')
const { responseEnvelope } = require('../utils/response')

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
}

module.exports = {
  createAuthMiddleware,
}
