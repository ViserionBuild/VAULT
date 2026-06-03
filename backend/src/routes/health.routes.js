const express = require('express')
const { responseEnvelope } = require('../utils/response')
const { createSupabaseClient } = require('../db_service/supabase')

const supabase = createSupabaseClient()

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

  router.get('/ping_db', async (_req, res) => {
    try {
      // lightweight query
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(1)

      if (error) throw error

      res.json(
        responseEnvelope({
          status: 'db_ok',
          timestamp: new Date().toISOString(),
        }),
      )
    } catch (err) {
      res.status(500).json(
        responseEnvelope({
          status: 'db_error',
          error: err.message,
        }),
      )
    }
  })

  return router
}

module.exports = {
  createHealthRouter,
}