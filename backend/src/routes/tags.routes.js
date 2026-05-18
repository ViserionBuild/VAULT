const express = require('express')
const { z } = require('zod')
const { createTagSchema, updateTagSchema } = require('../validators/tags')
const { responseEnvelope } = require('../utils/response')

function createTagsRouter({ store, authMiddleware }) {
  const router = express.Router()

  router.get('/', authMiddleware, async (req, res) => {
    const tags = await store.getTags(req.user.id)
    return res.json(responseEnvelope(tags))
  })

  router.post('/', authMiddleware, async (req, res) => {
    try {
      const payload = createTagSchema.parse(req.body)
      const tag = await store.createTag({ ...payload, userId: req.user.id })
      if (!tag) {
        return res.status(409).json(
          responseEnvelope(null, {
            code: 'DUPLICATE',
            message: 'Tag with this name already exists',
          }),
        )
      }
      return res.status(201).json(responseEnvelope(tag))
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid tag payload',
            details: error.issues,
          }),
        )
      }
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to create tag' }),
      )
    }
  })

  router.put('/:id', authMiddleware, async (req, res) => {
    try {
      const payload = updateTagSchema.parse(req.body)
      const tag = await store.updateTag(req.params.id, req.user.id, payload)
      if (!tag) {
        return res.status(404).json(
          responseEnvelope(null, {
            code: 'NOT_FOUND',
            message: 'Tag not found',
          }),
        )
      }
      return res.json(responseEnvelope(tag))
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid tag payload',
            details: error.issues,
          }),
        )
      }
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to update tag' }),
      )
    }
  })

  router.delete('/:id', authMiddleware, async (req, res) => {
    const ok = await store.deleteTag(req.params.id, req.user.id)
    if (!ok) {
      return res.status(404).json(
        responseEnvelope(null, {
          code: 'NOT_FOUND',
          message: 'Tag not found',
        }),
      )
    }
    return res.json(responseEnvelope({ message: 'Tag deleted' }))
  })

  return router
}

module.exports = {
  createTagsRouter,
}
