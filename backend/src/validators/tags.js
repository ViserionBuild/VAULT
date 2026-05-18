const { z } = require('zod')

const createTagSchema = z.object({
  name: z.string().min(1).max(64),
  color: z.string().max(32).optional(),
  icon: z.string().max(64).optional(),
})

const updateTagSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  color: z.string().max(32).optional(),
  icon: z.string().max(64).optional(),
})

module.exports = {
  createTagSchema,
  updateTagSchema,
}
