const express = require('express')
const { z } = require('zod')
const { sanitizeNoteContent } = require('../utils/note-sanitizer')
const { createNoteSchema, updateNoteSchema, moveNoteSchema } = require('../validators/notes')
const { responseEnvelope } = require('../utils/response')

function createNotesRouter({ store, authMiddleware }) {
  const router = express.Router()

  // Workspace-wide note search. Registered before '/:id' so the literal path
  // is not captured as an id.
  router.get('/search', authMiddleware, async (req, res) => {
    try {
      const { q, workspaceId } = req.query

      if (!workspaceId) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'workspaceId query parameter is required',
          }),
        )
      }

      const query = String(q ?? '').trim()
      if (!query) {
        return res.json(responseEnvelope({ items: [], query: '' }))
      }

      const [items, folderPaths] = await Promise.all([
        store.searchNotes({ userId: req.user.id, workspaceId, query }),
        store.getNotesFolderPathMap({ userId: req.user.id, workspaceId }),
      ])

      const withPaths = items.map((item) => {
        const names = item.parentId ? (folderPaths.get(String(item.parentId)) ?? []) : []
        return { ...item, path: ['Notes', ...names].join(' / ') }
      })

      return res.json(responseEnvelope({ items: withPaths, query }))
    } catch {
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Search failed' }),
      )
    }
  })

  router.get('/', authMiddleware, async (req, res) => {
    try {
      const { parentId, workspaceId, sortBy, sortOrder } = req.query

      if (!workspaceId) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'workspaceId query parameter is required',
          }),
        )
      }

      const workspace = await store.getWorkspaceById(workspaceId, req.user.id)
      if (!workspace) {
        return res.status(404).json(
          responseEnvelope(null, { code: 'NOT_FOUND', message: 'Workspace not found' }),
        )
      }

      // Get both note folders and notes, combine into single items array
      const folders = await store.getNotesFoldersByParent({
        parentId: parentId || null,
        userId: req.user.id,
        workspaceId,
        sortBy: sortBy || 'position',
        sortOrder: sortOrder || 'asc',
      })

      const notes = await store.getNotesByParent({
        parentId: parentId || null,
        userId: req.user.id,
        workspaceId,
        sortBy: sortBy || 'position',
        sortOrder: sortOrder || 'asc',
      })

      // Reuse the shared comparator so Notes and Resources order identically,
      // including folders-first grouping.
      const items = store._sortItems(
        [...(folders || []), ...(notes || [])],
        sortBy || 'position',
        sortOrder || 'asc',
      )

      let breadcrumbs = []
      if (parentId) {
        breadcrumbs = await store.getNotesBreadcrumbs(parentId, req.user.id)
      }

      return res.json(responseEnvelope({ items, breadcrumbs }))
    } catch {
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to fetch notes' }),
      )
    }
  })

  router.post('/', authMiddleware, async (req, res) => {
    try {
      const payload = createNoteSchema.parse(req.body)

      const workspace = await store.getWorkspaceById(payload.workspaceId, req.user.id)
      if (!workspace) {
        return res.status(404).json(
          responseEnvelope(null, { code: 'NOT_FOUND', message: 'Workspace not found' }),
        )
      }

      if (payload.parentId) {
        const parent = await store.getNotesFolderById(payload.parentId, req.user.id)
        if (!parent || parent.isDeleted) {
          return res.status(400).json(
            responseEnvelope(null, { code: 'VALIDATION_ERROR', message: 'Invalid parent folder' }),
          )
        }
      }

      const cleanedContent = sanitizeNoteContent(payload.content)

      const note = await store.createNote({
        title: payload.title.trim(),
        type: payload.type,
        content: cleanedContent,
        parentId: payload.parentId,
        userId: req.user.id,
        workspaceId: payload.workspaceId,
        description: payload.description,
        icon: payload.icon,
      })

      return res.status(201).json(responseEnvelope(note))
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid note payload',
            details: error.issues,
          }),
        )
      }

      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to create note' }),
      )
    }
  })

  router.get('/favorites', authMiddleware, async (req, res) => {
    const notes = await store.getFavoriteNotes(req.user.id)
    return res.json(responseEnvelope(notes))
  })

  router.get('/trash', authMiddleware, async (req, res) => {
    const notes = await store.getTrashNotes(req.user.id)
    return res.json(responseEnvelope(notes))
  })

  router.get('/:id', authMiddleware, async (req, res) => {
    const item = await store.getNoteItemById(req.params.id, req.user.id)
    if (!item) {
      return res.status(404).json(
        responseEnvelope(null, { code: 'NOT_FOUND', message: 'Note not found' }),
      )
    }
    return res.json(responseEnvelope(item))
  })

  router.put('/:id', authMiddleware, async (req, res) => {
    try {
      const payload = updateNoteSchema.parse(req.body)

      // sanitize content if present
      if (typeof payload.content === 'string') {
        payload.content = sanitizeNoteContent(payload.content)
      }

      const note = await store.updateNote(req.params.id, req.user.id, payload)
      if (!note) {
        return res.status(404).json(
          responseEnvelope(null, { code: 'NOT_FOUND', message: 'Note not found' }),
        )
      }
      return res.json(responseEnvelope(note))
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid note payload',
            details: error.issues,
          }),
        )
      }

      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to update note' }),
      )
    }
  })

  router.delete('/:id', authMiddleware, async (req, res) => {
    const item = await store.softDeleteNoteItem(req.params.id, req.user.id)
    if (!item) {
      return res.status(404).json(
        responseEnvelope(null, { code: 'NOT_FOUND', message: 'Note not found' }),
      )
    }
    return res.json(
      responseEnvelope({ message: item.type === 'folder' ? 'Folder moved to trash' : 'Note moved to trash' }),
    )
  })

  router.post('/:id/restore', authMiddleware, async (req, res) => {
    const item = await store.restoreNoteItem(req.params.id, req.user.id)
    if (!item) {
      return res.status(404).json(
        responseEnvelope(null, { code: 'NOT_FOUND', message: 'Note not found or not deleted' }),
      )
    }
    return res.json(responseEnvelope(item))
  })

  router.delete('/:id/purge', authMiddleware, async (req, res) => {
    const ok = await store.purgeNoteItem(req.params.id, req.user.id)
    if (!ok) {
      return res.status(404).json(
        responseEnvelope(null, { code: 'NOT_FOUND', message: 'Note not found' }),
      )
    }
    return res.json(responseEnvelope({ message: 'Note permanently deleted' }))
  })

  router.post('/:id/move', authMiddleware, async (req, res) => {
    try {
      const payload = moveNoteSchema.parse(req.body)
      const item = await store.moveNoteItem(req.params.id, req.user.id, payload.parentId)
      if (!item) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Cannot move note (not found or invalid parent)',
          }),
        )
      }
      return res.json(responseEnvelope(item))
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
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to move note' }),
      )
    }
  })

  router.post('/:id/favorite', authMiddleware, async (req, res) => {
    const item = await store.toggleFavoriteNoteItem(req.params.id, req.user.id)
    if (!item) {
      return res.status(404).json(
        responseEnvelope(null, { code: 'NOT_FOUND', message: 'Note not found' }),
      )
    }
    return res.json(responseEnvelope(item))
  })

  return router
}

module.exports = {
  createNotesRouter,
}