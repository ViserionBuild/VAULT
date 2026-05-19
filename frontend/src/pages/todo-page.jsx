import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApi } from '../hooks/use-api'
import { Dialog } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Button } from '../components/ui/button'
import {
  createTodoList,
  createTodoTask,
  deleteTodoList,
  deleteTodoTask,
  fetchTodoLists,
  fetchTodoTasks,
  updateTodoList,
  updateTodoTask,
} from '../services/todo-services'
import { TodoListPage } from './todo-list-page'
import { TodoDetailsPage } from './todo-details-page'

const priorities = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
]

function toDateInputValue(value) {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toApiDate(value) {
  if (!value) return null
  return new Date(`${value}T12:00:00Z`).toISOString()
}

function normalizeDueDate(value) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T12:00:00Z`).toISOString()
    }
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }
  return null
}

function normalizeTargetDate(value) {
  return normalizeDueDate(value)
}

function TodoDialog({ open, onClose, onSubmit, initialTodo }) {
  const [title, setTitle] = useState(initialTodo?.title ?? '')
  const [description, setDescription] = useState(initialTodo?.description ?? '')
  const [priority, setPriority] = useState(initialTodo?.priority ?? 0)
  const [targetDate, setTargetDate] = useState(toDateInputValue(initialTodo?.targetDate))

  const submit = () => {
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      description,
      priority: Number(priority),
      targetDate: toApiDate(targetDate),
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title={initialTodo ? 'Edit TODO' : 'New TODO'}>
      <div className="space-y-3">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
          placeholder="TODO title"
          autoFocus
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description"
          className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
            <Select value={priority} onChange={(event) => setPriority(event.target.value)}>
              {priorities.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Target date</label>
            <Input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>{initialTodo ? 'Save' : 'Create'}</Button>
        </div>
      </div>
    </Dialog>
  )
}

export function TodoPage() {
  const api = useApi()
  const navigate = useNavigate()
  const { listId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  // State - Todos
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(false)

  // State - Tasks
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(false)

  // State - Filters and sorting
  const [search, setSearch] = useState('')
  const [sortSpec, setSortSpec] = useState([
    { key: 'updatedAt', order: 'desc' },
  ])
  const [activeTab, setActiveTab] = useState('pending')

  // State - Selection and UI
  const [selectedIds, setSelectedIds] = useState([])
  const [todoDialog, setTodoDialog] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)

  const currentTodo = useMemo(
    () => todos.find((todo) => todo.id === listId) ?? null,
    [todos, listId],
  )

  // Fetch todos
  const fetchTodos = useCallback(async () => {
    setLoading(true)
    try {
      const primarySort = sortSpec[0] ?? { key: 'updatedAt', order: 'desc' }
      const data = await fetchTodoLists(api, { sortBy: primarySort.key, sortOrder: primarySort.order })
      setTodos(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [api, sortSpec])

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!listId) {
      setTasks([])
      return
    }

    setTasksLoading(true)
    try {
      const data = await fetchTodoTasks(api, listId)
      setTasks(data ?? [])
    } finally {
      setTasksLoading(false)
    }
  }, [api, listId])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchTodos()
    })
  }, [fetchTodos])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchTasks()
    })
  }, [fetchTasks])

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      queueMicrotask(() => {
        setTodoDialog({ mode: 'create' })
        setSearchParams({}, { replace: true })
      })
    }
  }, [searchParams, setSearchParams])

  // Sort handling
  const applySort = (key, options = {}) => {
    const { additive = false } = options
    const defaultOrder = key === 'title' ? 'asc' : 'desc'

    setSortSpec((current) => {
      const existingIndex = current.findIndex((entry) => entry.key === key)
      const next = additive ? [...current] : []

      if (existingIndex >= 0) {
        const target = additive ? next[existingIndex] : current[existingIndex]
        const nextOrder = target.order === 'asc' ? 'desc' : 'asc'
        const updated = { key, order: nextOrder }
        if (additive) {
          next[existingIndex] = updated
          return next
        }
        return [updated]
      }

      return [...next, { key, order: defaultOrder }]
    })
  }

  // Todo actions
  const saveTodo = async (payload) => {
    if (todoDialog?.todo) {
      await updateTodoList(api, todoDialog.todo.id, payload)
    } else {
      const created = await createTodoList(api, payload)
      navigate(`/todo/${created.id}`)
    }
    setTodoDialog(null)
    await fetchTodos()
  }

  const deleteTodos = async (ids) => {
    await Promise.all(ids.map((id) => deleteTodoList(api, id)))
    setSelectedIds([])
    setOpenMenuId(null)
    if (ids.includes(listId)) navigate('/todo')
    await fetchTodos()
  }

  const completeTodos = async (ids) => {
    await Promise.all(ids.map(async (id) => {
      const todoTasks = await fetchTodoTasks(api, id)
      await Promise.all(
        (todoTasks ?? [])
          .filter((task) => !task.completed)
          .map((task) => updateTodoTask(api, task.id, { completed: true })),
      )
    }))
    setSelectedIds([])
    setOpenMenuId(null)
    await Promise.all([fetchTodos(), ids.includes(listId) ? fetchTasks() : Promise.resolve()])
  }

  const duplicateTodo = async (todo) => {
    const created = await createTodoList(api, {
      title: `${todo.title} copy`,
      description: todo.description ?? '',
      priority: todo.priority ?? 0,
      targetDate: normalizeTargetDate(todo.targetDate),
    })
    const todoTasks = await fetchTodoTasks(api, todo.id)
    await Promise.all((todoTasks ?? []).map((task) =>
      createTodoTask(api, created.id, {
        title: task.title,
        description: task.description ?? '',
        priority: task.priority ?? 0,
        dueDate: normalizeDueDate(task.dueDate),
      }),
    ))
    setOpenMenuId(null)
    await fetchTodos()
  }

  // Task actions
  const createTask = async (payload) => {
    await createTodoTask(api, listId, payload)
    await Promise.all([fetchTasks(), fetchTodos()])
  }

  const updateTask = async (taskId, updates) => {
    await updateTodoTask(api, taskId, updates)
    await Promise.all([fetchTasks(), fetchTodos()])
  }

  const deleteTask = async (taskId) => {
    await deleteTodoTask(api, taskId)
    await Promise.all([fetchTasks(), fetchTodos()])
  }

  const duplicateTask = async (task) => {
    await createTodoTask(api, listId, {
      title: `${task.title} (Copy)`
        .replace(/\s+\(Copy\)$/, ' (Copy)')
        .trim(),
      description: task.description ?? '',
      priority: task.priority ?? 0,
      dueDate: normalizeDueDate(task.dueDate),
      completed: false,
    })
    await Promise.all([fetchTasks(), fetchTodos()])
  }

  const reorderTask = async (taskId, targetIndex) => {
    const currentIndex = tasks.findIndex((task) => task.id === taskId)
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= tasks.length) return
    if (currentIndex === targetIndex) return

    const nextTasks = [...tasks]
    const [moved] = nextTasks.splice(currentIndex, 1)
    nextTasks.splice(targetIndex, 0, moved)

    const sortedOrderIndexes = [...tasks]
      .map((task) => task.orderIndex)
      .sort((a, b) => a - b)

    const originalOrderById = new Map(tasks.map((task) => [task.id, task.orderIndex]))
    const updatedTasks = nextTasks.map((task, index) => ({
      ...task,
      orderIndex: sortedOrderIndexes[index] ?? index,
    }))

    setTasks(updatedTasks)

    const changedTasks = updatedTasks.filter(
      (task) => originalOrderById.get(task.id) !== task.orderIndex,
    )

    await Promise.all(
      changedTasks.map((task) => updateTodoTask(api, task.id, { orderIndex: task.orderIndex })),
    )
    await fetchTasks()
  }

  // Render Details View
  if (listId) {
    return (
      <>
        <TodoDetailsPage
          listId={listId}
          currentTodo={currentTodo}
          tasks={tasks}
          tasksLoading={tasksLoading}
          onEditTodo={(todo) => setTodoDialog({ mode: 'edit', todo })}
          onCreateTask={createTask}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onDuplicateTask={duplicateTask}
          onReorderTask={reorderTask}
        />

        {todoDialog && (
          <TodoDialog
            open={Boolean(todoDialog)}
            onClose={() => setTodoDialog(null)}
            onSubmit={saveTodo}
            initialTodo={todoDialog.todo}
          />
        )}
      </>
    )
  }

  // Render List View
  return (
    <>
      <TodoListPage
        todos={todos}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        sortSpec={sortSpec}
        onSortChange={applySort}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        openMenuId={openMenuId}
        onOpenMenuChange={setOpenMenuId}
        onCreateTodo={() => setTodoDialog({ mode: 'create' })}
        onEditTodo={(todo) => setTodoDialog({ mode: 'edit', todo })}
        onCompleteTodos={completeTodos}
        onDeleteTodos={deleteTodos}
        onDuplicateTodo={duplicateTodo}
      />

      {todoDialog && (
        <TodoDialog
          open={Boolean(todoDialog)}
          onClose={() => setTodoDialog(null)}
          onSubmit={saveTodo}
          initialTodo={todoDialog.todo}
        />
      )}
    </>
  )
}
