const { z } = require('zod')

const createItemSchema = z.object({
  title: z.string().min(1).max(512),
  type: z.enum(['folder', 'url']),
  url: z.string().url().optional(),
  description: z.string().max(2048).optional(),
  icon: z.string().max(64).optional(),
  color: z.string().max(32).optional(),
  parentId: z.string().optional().nullable(),
  workspaceId: z.string(),
})

const updateItemSchema = z.object({
  title: z.string().min(1).max(512).optional(),
  description: z.string().max(2048).optional(),
  url: z.string().url().optional(),
  icon: z.string().max(64).optional(),
  thumbnail: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional(),
})

const bulkActionSchema = z.object({
  action: z.enum(['delete', 'move', 'tag']),
  itemIds: z.array(z.string()).min(1).max(100),
  targetParentId: z.string().optional().nullable(),
  tagId: z.string().optional(),
})

const moveItemSchema = z.object({
  parentId: z.string().nullable(),
})

module.exports = {
  createItemSchema,
  updateItemSchema,
  bulkActionSchema,
  moveItemSchema,
}
