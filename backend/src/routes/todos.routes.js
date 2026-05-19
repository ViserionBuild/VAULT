const express = require('express')
const { z } = require('zod')
const {
  createTodoListSchema,
  updateTodoListSchema,
  createTodoTaskSchema,
  updateTodoTaskSchema,
} = require('../validators/todos')
const { responseEnvelope } = require('../utils/response')

function createTodosRouter({ store, authMiddleware }) {
  const router = express.Router()

  router.get('/lists', authMiddleware, async (req, res) => {
    try {
      const lists = await store.getTodoLists(req.user.id, {
        search: req.query.search,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
      })
      return res.json(responseEnvelope(lists))
    } catch (error) {
      return res.status(500).json(
        responseEnvelope(null, {
          code: 'INTERNAL_ERROR',
          message: process.env.NODE_ENV === 'production' ? 'Failed to fetch todo lists' : error.message,
        }),
      )
    }
  })

  router.post('/lists', authMiddleware, async (req, res) => {
    try {
      const payload = createTodoListSchema.parse(req.body)
      const list = await store.createTodoList({
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        targetDate: payload.targetDate,
        userId: req.user.id,
      })
      return res.status(201).json(responseEnvelope(list))
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid todo list payload',
            details: error.issues,
          }),
        )
      }
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to create todo list' }),
      )
    }
  })

  router.patch('/lists/:id', authMiddleware, async (req, res) => {
    try {
      const payload = updateTodoListSchema.parse(req.body)
      const list = await store.updateTodoList(req.params.id, req.user.id, payload)
      if (!list) {
        return res.status(404).json(
          responseEnvelope(null, { code: 'NOT_FOUND', message: 'Todo list not found' }),
        )
      }
      return res.json(responseEnvelope(list))
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid todo list payload',
            details: error.issues,
          }),
        )
      }
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to update todo list' }),
      )
    }
  })

  router.delete('/lists/:id', authMiddleware, async (req, res) => {
    try {
      const list = await store.softDeleteTodoList(req.params.id, req.user.id)
      if (!list) {
        return res.status(404).json(
          responseEnvelope(null, { code: 'NOT_FOUND', message: 'Todo list not found' }),
        )
      }
      return res.json(responseEnvelope({ message: 'Todo list deleted' }))
    } catch {
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to delete todo list' }),
      )
    }
  })

  router.get('/lists/:id/tasks', authMiddleware, async (req, res) => {
    try {
      const tasks = await store.getTodoTasks(req.params.id, req.user.id)
      if (!tasks) {
        return res.status(404).json(
          responseEnvelope(null, { code: 'NOT_FOUND', message: 'Todo list not found' }),
        )
      }
      return res.json(responseEnvelope(tasks))
    } catch {
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to fetch todo tasks' }),
      )
    }
  })

  router.post('/lists/:id/tasks', authMiddleware, async (req, res) => {
    try {
      const payload = createTodoTaskSchema.parse(req.body)
      const task = await store.createTodoTask({
        listId: req.params.id,
        userId: req.user.id,
        title: payload.title,
        description: payload.description,
        completed: payload.completed,
        priority: payload.priority,
        dueDate: payload.dueDate,
      })
      if (!task) {
        return res.status(404).json(
          responseEnvelope(null, { code: 'NOT_FOUND', message: 'Todo list not found' }),
        )
      }
      return res.status(201).json(responseEnvelope(task))
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid todo task payload',
            details: error.issues,
          }),
        )
      }
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to create todo task' }),
      )
    }
  })

  router.patch('/tasks/:id', authMiddleware, async (req, res) => {
    try {
      const payload = updateTodoTaskSchema.parse(req.body)
      const task = await store.updateTodoTask(req.params.id, req.user.id, payload)
      if (!task) {
        return res.status(404).json(
          responseEnvelope(null, { code: 'NOT_FOUND', message: 'Todo task not found' }),
        )
      }
      return res.json(responseEnvelope(task))
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid todo task payload',
            details: error.issues,
          }),
        )
      }
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to update todo task' }),
      )
    }
  })

  router.delete('/tasks/:id', authMiddleware, async (req, res) => {
    try {
      const ok = await store.deleteTodoTask(req.params.id, req.user.id)
      if (!ok) {
        return res.status(404).json(
          responseEnvelope(null, { code: 'NOT_FOUND', message: 'Todo task not found' }),
        )
      }
      return res.json(responseEnvelope({ message: 'Todo task deleted' }))
    } catch {
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Failed to delete todo task' }),
      )
    }
  })

  return router
}

module.exports = {
  createTodosRouter,
}
