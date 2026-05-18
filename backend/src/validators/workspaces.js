const { z } = require('zod')

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(64).optional(),
  color: z.string().max(32).optional(),
})

module.exports = {
  createWorkspaceSchema,
}
