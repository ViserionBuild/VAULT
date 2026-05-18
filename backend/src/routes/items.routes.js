const express = require('express')
const { z } = require('zod')
const {
  createItemSchema,
  updateItemSchema,
  bulkActionSchema,
  moveItemSchema,
} = require('../validators/items')
const { responseEnvelope } = require('../utils/response')
const { fetchUrlMetadata } = require('../services/metadata-service')

function createItemsRouter({ store, authMiddleware, metadataService }) {
  const router = express.Router()
  const fetchMetadata = metadataService ?? fetchUrlMetadata

  // Helper to attach tags to items for API responses
  const enrichItemWithTags = async (item) => {
    const tags = await store.getTagsForItem(item.id)
    return { ...item, tags }
  }

  const enrichItemsWithTags = async (items) => Promise.all(items.map(enrichItemWithTags))

  router.get('/', authMiddleware, async (req, res) => {
    try {
      const { parentId, workspaceId, type, sortBy, sortOrder } = req.query

      if (!workspaceId) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'workspaceId query parameter is required',
          }),
        )
      }

      const items = await store.getItemsByParent({
        parentId: parentId || null,
        userId: req.user.id,
        workspaceId,
        type: type || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
      })

      const enriched = await enrichItemsWithTags(items)

      // Build breadcrumbs if inside a folder
      let breadcrumbs = []
      if (parentId) {
        breadcrumbs = await store.getBreadcrumbs(parentId, req.user.id)
      }

      return res.json(responseEnvelope({ items: enriched, breadcrumbs }))
    } catch {
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to fetch items' }),
      )
    }
  })

  router.post('/', authMiddleware, async (req, res) => {
    try {
      const payload = createItemSchema.parse(req.body)

      // Validate workspace belongs to user
      const workspace = await store.getWorkspaceById(payload.workspaceId, req.user.id)
      if (!workspace) {
        return res.status(404).json(
          responseEnvelope(null, { code: 'NOT_FOUND', message: 'Workspace not found' }),
        )
      }

      // If parentId provided, validate it exists and is a folder
      if (payload.parentId) {
        const parent = await store.getItemById(payload.parentId, req.user.id)
        if (!parent || parent.type !== 'folder' || parent.isDeleted) {
          return res.status(400).json(
            responseEnvelope(null, { code: 'VALIDATION_ERROR', message: 'Invalid parent folder' }),
          )
        }
      }

      // URL type must have a URL
      if (payload.type === 'url' && !payload.url) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'URL is required for url type items',
          }),
        )
      }

      const item = await store.createItem({
        title: payload.title.trim(),
        type: payload.type,
        url: payload.url,
        description: payload.description ?? '',
        icon: payload.icon,
        color: payload.color,
        parentId: payload.parentId,
        userId: req.user.id,
        workspaceId: payload.workspaceId,
      })

      // Auto-fetch metadata in background for URL resources
      if (item.type === 'url' && item.url) {
        fetchMetadata(item.url)
          .then(async (meta) => {
            const updates = {}
            if (meta.title && !payload.title) updates.title = meta.title
            if (meta.description && !payload.description) updates.description = meta.description
            if (meta.favicon) updates.icon = meta.favicon
            if (meta.ogImage) updates.thumbnail = meta.ogImage
            updates.metadata = {
              ...item.metadata,
              ogTitle: meta.title,
              ogDescription: meta.description,
              ogImage: meta.ogImage,
              favicon: meta.favicon,
              siteName: meta.siteName,
              fetchedAt: new Date().toISOString(),
            }
            await store.updateItem(item.id, req.user.id, updates)
          })
          .catch(() => {
            // Ignore metadata fetch errors
          })
      }

      const enriched = await enrichItemWithTags(item)
      return res.status(201).json(responseEnvelope(enriched))
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid item payload',
            details: error.issues,
          }),
        )
      }
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to create item' }),
      )
    }
  })

  router.get('/favorites', authMiddleware, async (req, res) => {
    const items = await store.getFavoriteItems(req.user.id)
    const enriched = await enrichItemsWithTags(items)
    return res.json(responseEnvelope(enriched))
  })

  router.get('/trash', authMiddleware, async (req, res) => {
    const items = await store.getTrashItems(req.user.id)
    const enriched = await enrichItemsWithTags(items)
    return res.json(responseEnvelope(enriched))
  })

  router.get('/:id', authMiddleware, async (req, res) => {
    const item = await store.getItemById(req.params.id, req.user.id)
    if (!item) {
      return res.status(404).json(
        responseEnvelope(null, { code: 'NOT_FOUND', message: 'Item not found' }),
      )
    }
    const enriched = await enrichItemWithTags(item)
    const breadcrumbs = await store.getBreadcrumbs(item.id, req.user.id)
    return res.json(responseEnvelope({ ...enriched, breadcrumbs }))
  })

  router.put('/:id', authMiddleware, async (req, res) => {
    try {
      const payload = updateItemSchema.parse(req.body)
      const item = await store.updateItem(req.params.id, req.user.id, payload)
      if (!item) {
        return res.status(404).json(
          responseEnvelope(null, { code: 'NOT_FOUND', message: 'Item not found' }),
        )
      }
      const enriched = await enrichItemWithTags(item)
      return res.json(responseEnvelope(enriched))
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update payload',
            details: error.issues,
          }),
        )
      }
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to update item' }),
      )
    }
  })

  router.delete('/:id', authMiddleware, async (req, res) => {
    const item = await store.softDeleteItem(req.params.id, req.user.id)
    if (!item) {
      return res.status(404).json(
        responseEnvelope(null, { code: 'NOT_FOUND', message: 'Item not found' }),
      )
    }
    return res.json(responseEnvelope({ message: 'Item moved to trash' }))
  })

  router.post('/:id/restore', authMiddleware, async (req, res) => {
    const item = await store.restoreItem(req.params.id, req.user.id)
    if (!item) {
      return res.status(404).json(
        responseEnvelope(null, { code: 'NOT_FOUND', message: 'Item not found or not deleted' }),
      )
    }
    const enriched = await enrichItemWithTags(item)
    return res.json(responseEnvelope(enriched))
  })

  router.delete('/:id/purge', authMiddleware, async (req, res) => {
    const ok = await store.purgeItem(req.params.id, req.user.id)
    if (!ok) {
      return res.status(404).json(
        responseEnvelope(null, { code: 'NOT_FOUND', message: 'Item not found' }),
      )
    }
    return res.json(responseEnvelope({ message: 'Item permanently deleted' }))
  })

  router.post('/:id/favorite', authMiddleware, async (req, res) => {
    const item = await store.toggleFavorite(req.params.id, req.user.id)
    if (!item) {
      return res.status(404).json(
        responseEnvelope(null, { code: 'NOT_FOUND', message: 'Item not found' }),
      )
    }
    const enriched = await enrichItemWithTags(item)
    return res.json(responseEnvelope(enriched))
  })

  router.post('/:id/move', authMiddleware, async (req, res) => {
    try {
      const payload = moveItemSchema.parse(req.body)
      const item = await store.moveItem(req.params.id, req.user.id, payload.parentId)
      if (!item) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Cannot move item (not found or circular reference)',
          }),
        )
      }
      const enriched = await enrichItemWithTags(item)
      return res.json(responseEnvelope(enriched))
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid move payload',
            details: error.issues,
          }),
        )
      }
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to move item' }),
      )
    }
  })

  router.post('/:id/metadata', authMiddleware, async (req, res) => {
    const item = await store.getItemById(req.params.id, req.user.id)
    if (!item || item.type !== 'url' || !item.url) {
      return res.status(400).json(
        responseEnvelope(null, {
          code: 'VALIDATION_ERROR',
          message: 'Item is not a URL resource',
        }),
      )
    }

    try {
      const meta = await fetchMetadata(item.url)
      const updates = {
        metadata: {
          ...item.metadata,
          ogTitle: meta.title,
          ogDescription: meta.description,
          ogImage: meta.ogImage,
          favicon: meta.favicon,
          siteName: meta.siteName,
          fetchedAt: new Date().toISOString(),
        },
      }
      if (meta.favicon) updates.icon = meta.favicon
      if (meta.ogImage) updates.thumbnail = meta.ogImage

      const updated = await store.updateItem(item.id, req.user.id, updates)
      const enriched = await enrichItemWithTags(updated)
      return res.json(responseEnvelope(enriched))
    } catch {
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to fetch metadata' }),
      )
    }
  })

  router.post('/bulk', authMiddleware, async (req, res) => {
    try {
      const payload = bulkActionSchema.parse(req.body)

      if (payload.action === 'delete') {
        const results = await store.bulkDeleteItems(payload.itemIds, req.user.id)
        return res.json(responseEnvelope({ affected: results.length }))
      }

      if (payload.action === 'move') {
        const results = await store.bulkMoveItems(
          payload.itemIds,
          req.user.id,
          payload.targetParentId ?? null,
        )
        return res.json(responseEnvelope({ affected: results.length }))
      }

      if (payload.action === 'tag') {
        if (!payload.tagId) {
          return res.status(400).json(
            responseEnvelope(null, {
              code: 'VALIDATION_ERROR',
              message: 'tagId is required for tag action',
            }),
          )
        }
        const results = await store.bulkTagItems(payload.itemIds, payload.tagId, req.user.id)
        return res.json(responseEnvelope({ affected: results.length }))
      }

      return res.status(400).json(
        responseEnvelope(null, { code: 'VALIDATION_ERROR', message: 'Unknown action' }),
      )
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid bulk action payload',
            details: error.issues,
          }),
        )
      }
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Bulk action failed' }),
      )
    }
  })

  router.post('/:id/tags/:tagId', authMiddleware, async (req, res) => {
    const ok = await store.addTagToItem(req.params.id, req.params.tagId, req.user.id)
    if (!ok) {
      return res.status(404).json(
        responseEnvelope(null, { code: 'NOT_FOUND', message: 'Item or tag not found' }),
      )
    }
    return res.json(responseEnvelope({ message: 'Tag added' }))
  })

  router.delete('/:id/tags/:tagId', authMiddleware, async (req, res) => {
    const ok = await store.removeTagFromItem(req.params.id, req.params.tagId, req.user.id)
    if (!ok) {
      return res.status(404).json(
        responseEnvelope(null, { code: 'NOT_FOUND', message: 'Item or tag not found' }),
      )
    }
    return res.json(responseEnvelope({ message: 'Tag removed' }))
  })

  return router
}

module.exports = {
  createItemsRouter,
}
