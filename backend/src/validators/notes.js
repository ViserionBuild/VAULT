const { z } = require('zod')

const createNoteSchema = z.object({
  title: z.string().min(1).max(512),
  type: z.enum(['folder', 'note']),
  content: z.string().max(100000).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  workspaceId: z.string(),
})

const updateNoteSchema = z.object({
  title: z.string().min(1).max(512).optional(),
  content: z.string().max(100000).optional(),
  description: z.string().max(1000).optional(),
})

const moveNoteSchema = z.object({
  parentId: z.string().nullable(),
})

module.exports = {
  createNoteSchema,
  updateNoteSchema,
  moveNoteSchema,
}