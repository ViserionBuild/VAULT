const { z } = require('zod')

const tagName = z
  .string()
  .trim()
  .min(1, 'Tag name is required')
  .max(64, 'Tag names can be at most 64 characters')

const createTagSchema = z.object({
  name: tagName,
  color: z.string().max(32).optional(),
  icon: z.string().max(64).optional(),
})

const updateTagSchema = z.object({
  name: tagName.optional(),
  color: z.string().max(32).optional(),
  icon: z.string().max(64).optional(),
})

module.exports = {
  createTagSchema,
  updateTagSchema,
}
