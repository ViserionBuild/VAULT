const express = require('express')
const { z } = require('zod')
const { createWorkspaceSchema } = require('../validators/workspaces')
const { responseEnvelope } = require('../utils/response')

function createWorkspacesRouter({ store, authMiddleware }) {
  const router = express.Router()

  router.get('/', authMiddleware, async (req, res) => {
    const workspaces = await store.getWorkspaces(req.user.id)
    return res.json(responseEnvelope(workspaces))
  })

  router.post('/', authMiddleware, async (req, res) => {
    try {
      const payload = createWorkspaceSchema.parse(req.body)
      const workspace = await store.createWorkspace({
        ...payload,
        userId: req.user.id,
        isDefault: false,
      })
      return res.status(201).json(responseEnvelope(workspace))
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid workspace payload',
            details: error.issues,
          }),
        )
      }
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to create workspace' }),
      )
    }
  })

  return router
}

module.exports = {
  createWorkspacesRouter,
}
