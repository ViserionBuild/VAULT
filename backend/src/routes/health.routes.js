const express = require('express')
const { responseEnvelope } = require('../utils/response')

function createHealthRouter() {
  const router = express.Router()

  router.get('/', (_req, res) => {
    res.json(
      responseEnvelope({
        status: 'ok',
        timestamp: new Date().toISOString(),
      }),
    )
  })

  return router
}

module.exports = {
  createHealthRouter,
}
