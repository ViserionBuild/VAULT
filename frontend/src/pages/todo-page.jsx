import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApi } from '../hooks/use-api'
import { Dialog } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { PriorityRating } from '../components/ui/priority-rating'
import { Button } from '../components/ui/button'
import { useToast } from '../components/ui/toast'
import { usePersistentSort } from '../hooks/use-persistent-sort'
import {
  createTodoList,
  createTodoTask,
  deleteTodoList,
  deleteTodoTask,
  fetchTodoLists,
  fetchTodoTasks,
  restoreTodoList,
  updateTodoList,
  updateTodoTask,
} from '../services/todo-services'
import { TodoListPage } from './todo-list-page'
import { TodoDetailsPage } from './todo-details-page'

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

/** Today, formatted for a <input type="date">. */
function todayInputValue() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function shiftDays(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const DATE_PRESETS = [
  { label: 'Today', get: () => todayInputValue() },
  { label: 'Tomorrow', get: () => shiftDays(1) },
  { label: 'Next week', get: () => shiftDays(7) },
]

/**
 * Create/edit a list.
 *
 * Everything except the title is pre-filled with a sensible default — today's
 * date and priority 4 — so the common case is: type a name, press Enter.
 * Description and date only appear if the user asks for them.
 */
function TodoDialog({ open, onClose, onSubmit, initialTodo }) {
  const isEdit = Boolean(initialTodo)

  const [title, setTitle] = useState(initialTodo?.title ?? '')
  const [description, setDescription] = useState(initialTodo?.description ?? '')
  // Defaults: today, and "Important" (4 of 5).
  const [priority, setPriority] = useState(initialTodo?.priority ?? 4)
  const [targetDate, setTargetDate] = useState(
    initialTodo ? toDateInputValue(initialTodo.targetDate) : todayInputValue(),
  )
  const [showDetails, setShowDetails] = useState(Boolean(initialTodo?.description))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        priority: Number(priority),
        targetDate: toApiDate(targetDate),
      })
    } catch (err) {
      // Stay open with the input intact so the user can retry.
      setError(err.message || 'Could not save the list. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? 'Edit list' : 'New list'}>
      <div className="space-y-4">
        <div>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submit()}
            placeholder="What needs doing?"
            className="h-11 text-base"
            autoFocus
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Press Enter to save — everything below is optional.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Priority
          </label>
          <PriorityRating value={priority} onChange={setPriority} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Target date
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {DATE_PRESETS.map((preset) => {
              const value = preset.get()
              const active = targetDate === value
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setTargetDate(active ? '' : value)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
            <Input
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              className="h-8 w-auto text-xs"
            />
            {targetDate ? (
              <button
                type="button"
                onClick={() => setTargetDate('')}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {showDetails ? (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Any extra context"
              className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            + Add a description
          </button>
        )}

        {error && (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!title.trim() || saving}>
            {saving ? 'Saving…' : isEdit ? 'Save' : 'Create list'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

export function TodoPage() {
  const api = useApi()
  const toast = useToast()
  const navigate = useNavigate()
  const { listId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  // State - Todos
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(false)
  const [todosLoaded, setTodosLoaded] = useState(false)

  // State - Tasks
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(false)

  // State - Filters and sorting
  const [search, setSearch] = useState('')
  // Sort and the Pending/Completed/All filter are remembered across visits.
  const { sortBy, sortOrder, changeSort } = usePersistentSort('vault-todo-sort', {
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  })
  const sortSpec = useMemo(() => [{ key: sortBy, order: sortOrder }], [sortBy, sortOrder])
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return localStorage.getItem('vault-todo-tab') ?? 'pending'
    } catch {
      return 'pending'
    }
  })
  const setActiveTab = (tab) => {
    setActiveTabState(tab)
    try {
      localStorage.setItem('vault-todo-tab', tab)
    } catch {
      // Not persisted; still applies for this visit.
    }
  }

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
      const data = await fetchTodoLists(api, { sortBy, sortOrder })
      setTodos(data ?? [])
    } catch {
      toast.error("Couldn't load your lists. Please try again.")
    } finally {
      setLoading(false)
      setTodosLoaded(true)
    }
  }, [api, sortBy, sortOrder, toast])

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
    } catch {
      setTasks([])
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

  // One-click actions apply at once; failures show a toast and reload.
  const attempt = async (action, failMessage) => {
    try {
      await action()
    } catch (error) {
      toast.error(error.status === 400 && error.message ? error.message : failMessage)
      fetchTodos()
      fetchTasks()
    }
  }

  // Keep a list card's counts in step with local task changes.
  const adjustCounts = (todoId, { tasks: dTasks = 0, done: dDone = 0 }) =>
    setTodos((prev) =>
      prev.map((todo) => {
        if (todo.id !== todoId) return todo
        const taskCount = Math.max(0, (todo.taskCount ?? 0) + dTasks)
        const completedTaskCount = Math.max(0, (todo.completedTaskCount ?? 0) + dDone)
        return { ...todo, taskCount, completedTaskCount, completed: taskCount > 0 && completedTaskCount === taskCount }
      }),
    )

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

  const deleteTodos = (ids) =>
    attempt(async () => {
      setTodos((prev) => prev.filter((todo) => !ids.includes(todo.id)))
      setSelectedIds([])
      setOpenMenuId(null)
      if (ids.includes(listId)) navigate('/todo')
      await Promise.all(ids.map((id) => deleteTodoList(api, id)))
      toast.show({
        message: ids.length === 1 ? 'List deleted' : `${ids.length} lists deleted`,
        action: {
          label: 'Undo',
          onClick: () =>
            attempt(async () => {
              await Promise.all(ids.map((id) => restoreTodoList(api, id)))
              fetchTodos()
            }, 'Could not restore the list.'),
        },
      })
    }, 'Could not delete. Please try again.')

  const completeTodos = (ids) => attempt(async () => {
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
    toast.success(ids.length === 1 ? 'List completed' : `${ids.length} lists completed`)
  }, 'Could not complete. Please try again.')

  const duplicateTodo = (todo) => attempt(async () => {
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
    toast.success(`Duplicated “${todo.title}”`)
  }, 'Could not duplicate the list.')

  // Task actions
  // Quick-add keeps its text on failure (it only resets on success).
  const createTask = async (payload) => {
    try {
      const created = await createTodoTask(api, listId, payload)
      setTasks((prev) => [...prev, created])
      adjustCounts(listId, { tasks: 1, done: created.completed ? 1 : 0 })
    } catch (error) {
      toast.error(error.message || 'Could not add the task.')
      throw error
    }
  }

  const updateTask = (taskId, updates) =>
    attempt(async () => {
      const before = tasks.find((task) => task.id === taskId)
      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)))
      if (before && 'completed' in updates && Boolean(updates.completed) !== Boolean(before.completed)) {
        adjustCounts(listId, { done: updates.completed ? 1 : -1 })
      }
      await updateTodoTask(api, taskId, updates)
    }, 'Could not update the task.')

  const deleteTask = (taskId) =>
    attempt(async () => {
      const task = tasks.find((t) => t.id === taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      adjustCounts(listId, { tasks: -1, done: task?.completed ? -1 : 0 })
      await deleteTodoTask(api, taskId)
      if (!task) return
      // Tasks are deleted outright, so Undo re-creates it with the same details.
      const targetListId = listId
      toast.show({
        message: 'Task deleted',
        action: {
          label: 'Undo',
          onClick: () =>
            attempt(async () => {
              await createTodoTask(api, targetListId, {
                title: task.title,
                description: task.description ?? '',
                priority: task.priority ?? 0,
                dueDate: normalizeDueDate(task.dueDate),
                completed: Boolean(task.completed),
              })
              fetchTasks()
              fetchTodos()
            }, 'Could not restore the task.'),
        },
      })
    }, 'Could not delete the task.')

  const duplicateTask = (task) => attempt(async () => {
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
  }, 'Could not duplicate the task.')

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
          notFound={todosLoaded && !loading && !currentTodo}
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
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={changeSort}
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
