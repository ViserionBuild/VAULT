const express = require('express')
const { z } = require('zod')
const { createTagSchema, updateTagSchema } = require('../validators/tags')
const { responseEnvelope } = require('../utils/response')

function createTagsRouter({ store, authMiddleware }) {
  const router = express.Router()

  router.get('/', authMiddleware, async (req, res) => {
    try {
      const tags = await store.getTags(req.user.id)
      const counts = await store.getTagItemCounts(tags.map((tag) => tag.id))
      const withCounts = tags
        .map((tag) => ({ ...tag, itemCount: counts.get(String(tag.id)) ?? 0 }))
        .sort((a, b) => a.name.localeCompare(b.name))
      return res.json(responseEnvelope(withCounts))
    } catch {
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to load tags' }),
      )
    }
  })

  // Items carrying a tag in one workspace, each with the folder path it lives
  // in (like search results), for the Tags page.
  router.get('/:id/items', authMiddleware, async (req, res) => {
    try {
      const { workspaceId } = req.query
      if (!workspaceId) {
        return res.status(400).json(
          responseEnvelope(null, { code: 'VALIDATION_ERROR', message: 'workspaceId query parameter is required' }),
        )
      }
      const tag = await store.getTagById(req.params.id, req.user.id)
      if (!tag) {
        return res.status(404).json(responseEnvelope(null, { code: 'NOT_FOUND', message: 'Tag not found' }))
      }
      const [items, folderPaths] = await Promise.all([
        store.getItemsByTag(tag.id, req.user.id),
        store.getFolderPathMap({ userId: req.user.id, workspaceId }),
      ])
      const inWorkspace = items
        .filter((item) => String(item.workspaceId) === String(workspaceId))
        .map((item) => {
          const names = item.parentId ? (folderPaths.get(String(item.parentId)) ?? []) : []
          return { ...item, path: ['Resources', ...names].join(' / ') }
        })
        .sort((a, b) => a.title.localeCompare(b.title))
      return res.json(responseEnvelope({ tag, items: inWorkspace }))
    } catch {
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to load tagged items' }),
      )
    }
  })

  router.post('/', authMiddleware, async (req, res) => {
    try {
      const payload = createTagSchema.parse(req.body)
      const tag = await store.createTag({ ...payload, userId: req.user.id })
      if (!tag) {
        return res.status(409).json(
          responseEnvelope(null, {
            code: 'DUPLICATE',
            message: 'A tag with this name already exists',
          }),
        )
      }
      return res.status(201).json(responseEnvelope(tag))
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: error.issues[0]?.message ?? 'Invalid tag payload',
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
            message: error.issues[0]?.message ?? 'Invalid tag payload',
            details: error.issues,
          }),
        )
      }
      if (error?.code === '23505') {
        return res.status(409).json(
          responseEnvelope(null, { code: 'DUPLICATE', message: 'A tag with this name already exists' }),
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
