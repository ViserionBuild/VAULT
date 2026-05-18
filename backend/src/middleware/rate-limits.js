const rateLimit = require('express-rate-limit')
const { responseEnvelope } = require('../utils/response')

function createAuthLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: responseEnvelope(null, {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please retry in a minute.',
    }),
  })
}

function createProtectedLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })
}

module.exports = {
  createAuthLimiter,
  createProtectedLimiter,
}
