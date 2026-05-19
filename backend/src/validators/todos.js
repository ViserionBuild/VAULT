const { z } = require('zod')

const nullableDateTimeSchema = z.preprocess((value) => {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }
  return value
}, z.string().datetime().nullable().optional())

const createTodoListSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2048).optional(),
  priority: z.number().int().min(0).max(3).optional(),
  targetDate: nullableDateTimeSchema,
})

const updateTodoListSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2048).optional(),
  priority: z.number().int().min(0).max(3).optional(),
  targetDate: nullableDateTimeSchema,
})

const createTodoTaskSchema = z.object({
  title: z.string().min(1).max(512),
  description: z.string().max(5000).optional(),
  completed: z.boolean().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  dueDate: nullableDateTimeSchema,
})

const updateTodoTaskSchema = z.object({
  title: z.string().min(1).max(512).optional(),
  description: z.string().max(5000).optional(),
  completed: z.boolean().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  dueDate: nullableDateTimeSchema,
  orderIndex: z.number().int().min(0).optional(),
})

module.exports = {
  createTodoListSchema,
  updateTodoListSchema,
  createTodoTaskSchema,
  updateTodoTaskSchema,
}
