const { z } = require('zod')

// People rarely type the scheme ("github.com"), and on phones almost never.
// Add https:// so the URL validates and later opens as an absolute link.
const urlSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}, z.string().url('Enter a valid web address, like example.com').max(2048).optional())

const createItemSchema = z.object({
  // Optional for links: left blank, the page's own title is filled in once
  // its metadata is fetched. Folders must be named (enforced below).
  title: z.string().trim().max(512).optional(),
  type: z.enum(['folder', 'url']),
  url: urlSchema,
  description: z.string().max(2048).optional(),
  icon: z.string().max(2048).optional(),
  color: z.string().max(32).optional(),
  parentId: z.string().optional().nullable(),
  workspaceId: z.string(),
}).refine((item) => item.type !== 'folder' || Boolean(item.title), {
  message: 'Folder name is required',
  path: ['title'],
})

const updateItemSchema = z.object({
  title: z.string().min(1).max(512).optional(),
  description: z.string().max(2048).optional(),
  url: urlSchema,
  icon: z.string().max(2048).optional(),
  color: z.string().max(32).optional(),
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
