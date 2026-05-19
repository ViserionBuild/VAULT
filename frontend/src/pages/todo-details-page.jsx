import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Check, Circle, Copy, Edit3, ListChecks,
  Plus, RefreshCw, X
} from 'lucide-react'

import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'

const priorities = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
]

function formatDate(value) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value),
  )
}

function priorityLabel(value) {
  return priorities.find((priority) => priority.value === Number(value))?.label ?? 'None'
}

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

function ProgressBar({ completed, total }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{completed}/{total} tasks completed</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export function TodoDetailsPage({
  currentTodo,
  tasks,
  tasksLoading,
  onEditTodo,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onReorderTask,
}) {
  const navigate = useNavigate()
  const [activeEditor, setActiveEditor] = useState(null)
  const [dragState, setDragState] = useState({ draggingId: null, overId: null })

  const startCreate = () => {
    setActiveEditor({
      mode: 'create',
      taskId: null,
      draft: {
        title: '',
        description: '',
        priority: 0,
        dueDate: '',
        completed: false,
      },
    })
  }

  const startEdit = (task) => {
    setActiveEditor({
      mode: 'edit',
      taskId: task.id,
      draft: {
        title: task.title ?? '',
        description: task.description ?? '',
        priority: task.priority ?? 0,
        dueDate: toDateInputValue(task.dueDate),
        completed: Boolean(task.completed),
      },
    })
  }

  const cancelEdit = () => setActiveEditor(null)

  const updateDraft = (field, value) => {
    setActiveEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, [field]: value } } : prev))
  }

  const submitDraft = async () => {
    if (!activeEditor?.draft?.title?.trim()) return
    const payload = {
      title: activeEditor.draft.title.trim(),
      description: activeEditor.draft.description?.trim() ?? '',
      priority: Number(activeEditor.draft.priority) || 0,
      dueDate: toApiDate(activeEditor.draft.dueDate),
      completed: Boolean(activeEditor.draft.completed),
    }

    if (activeEditor.mode === 'create') {
      await onCreateTask(payload)
    } else if (activeEditor.taskId) {
      await onUpdateTask(activeEditor.taskId, payload)
    }
    setActiveEditor(null)
  }

  const handleDragStart = (taskId) => (event) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', taskId)
    setDragState({ draggingId: taskId, overId: null })
  }

  const handleDragOver = (taskId) => (event) => {
    event.preventDefault()
    if (dragState.overId !== taskId) {
      setDragState((prev) => ({ ...prev, overId: taskId }))
    }
    event.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (taskId) => async (event) => {
    event.preventDefault()
    const draggedId = dragState.draggingId ?? event.dataTransfer.getData('text/plain')
    if (!draggedId || draggedId === taskId) return
    const fromIndex = tasks.findIndex((task) => task.id === draggedId)
    const toIndex = tasks.findIndex((task) => task.id === taskId)
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return
    await onReorderTask(draggedId, toIndex)
    setDragState({ draggingId: null, overId: null })
  }

  const handleDragEnd = () => setDragState({ draggingId: null, overId: null })

  const detailMetrics = useMemo(() => {
    const completed = tasks.filter((task) => task.completed).length
    return { completed, total: tasks.length }
  }, [tasks])

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="mb-2 -ml-3" onClick={() => navigate('/todo')}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> TODO
          </Button>
          <h1 className="truncate text-2xl font-bold tracking-tight">{currentTodo?.title ?? 'TODO'}</h1>
          {currentTodo?.description && (
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{currentTodo.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentTodo && (
            <Button variant="outline" size="sm" onClick={() => onEditTodo(currentTodo)}>
              <Edit3 className="mr-1.5 h-4 w-4" /> Edit
            </Button>
          )}
          <Button size="sm" onClick={startCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Task
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
        <ProgressBar completed={detailMetrics.completed} total={detailMetrics.total} />
        <div className="text-sm text-muted-foreground">Created {formatDate(currentTodo?.createdAt)}</div>
        <div className="text-sm text-muted-foreground">Updated {formatDate(currentTodo?.updatedAt)}</div>
      </div>

      {tasksLoading && (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!tasksLoading && tasks.length === 0 && !activeEditor && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <ListChecks className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <h3 className="font-semibold">No tasks yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add checklist items to track this TODO.</p>
          <Button className="mt-4" onClick={startCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Task
          </Button>
        </div>
      )}

      {!tasksLoading && (tasks.length > 0 || activeEditor) && (
        <div className="rounded-lg border border-border bg-card">
          <div className="divide-y divide-border">
            {tasks.map((task) => {
              const isEditing = activeEditor?.mode === 'edit' && activeEditor?.taskId === task.id

              if (isEditing) {
                return (
                  <div key={task.id} className="space-y-3 px-4 py-4">
                    <div className="grid gap-4 sm:grid-cols-[1fr_220px] sm:items-start">
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                          <Input
                            value={activeEditor.draft.title}
                            onChange={(event) => updateDraft('title', event.target.value)}
                            placeholder="Task title"
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={activeEditor.draft.completed}
                                onChange={(event) => updateDraft('completed', event.target.checked)}
                              />
                              Completed
                            </label>
                          </div>
                        </div>
                        <textarea
                          value={activeEditor.draft.description}
                          onChange={(event) => updateDraft('description', event.target.value)}
                          placeholder="Notes or description"
                          className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                      </div>
                      <div className="space-y-3 sm:pt-0">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
                          <Select
                            value={activeEditor.draft.priority}
                            onChange={(event) => updateDraft('priority', event.target.value)}
                          >
                            {priorities.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">Due date</label>
                          <Input
                            type="date"
                            value={activeEditor.draft.dueDate}
                            onChange={(event) => updateDraft('dueDate', event.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 sm:pr-1">
                      <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                      <Button size="sm" onClick={submitDraft}>Save</Button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={task.id}
                  className={`flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-muted/30 sm:flex-row sm:items-start ${dragState.overId === task.id ? 'bg-muted/40' : ''}`}
                  draggable
                  onDragStart={handleDragStart(task.id)}
                  onDragOver={handleDragOver(task.id)}
                  onDrop={handleDrop(task.id)}
                  onDragEnd={handleDragEnd}
                  onDoubleClick={() => startEdit(task)}
                >
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      onUpdateTask(task.id, { completed: !task.completed })
                    }}
                    className="mt-0.5 text-primary"
                    title={task.completed ? 'Mark pending' : 'Mark completed'}
                  >
                    {task.completed ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className={`font-medium ${task.completed ? 'text-muted-foreground line-through' : ''}`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>
                      )}
                    </div>
                    <div className="flex w-full flex-col items-start gap-1 text-xs text-muted-foreground sm:w-[220px] sm:items-end">
                      <span className="rounded-full border border-border px-2 py-0.5">
                        {priorityLabel(task.priority)}
                      </span>
                      <span className="rounded-full border border-border px-2 py-0.5">
                        {task.dueDate ? `Due ${formatDate(task.dueDate)}` : 'No due date'}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(task)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDuplicateTask(task)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDeleteTask(task.id)}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )
            })}

            {activeEditor?.mode === 'create' && (
              <div className="space-y-3 px-4 py-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_220px] sm:items-start">
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                      <Input
                        value={activeEditor.draft.title}
                        onChange={(event) => updateDraft('title', event.target.value)}
                        placeholder="Task title"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={activeEditor.draft.completed}
                            onChange={(event) => updateDraft('completed', event.target.checked)}
                          />
                          Completed
                        </label>
                      </div>
                    </div>
                    <textarea
                      value={activeEditor.draft.description}
                      onChange={(event) => updateDraft('description', event.target.value)}
                      placeholder="Notes or description"
                      className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
                      <Select
                        value={activeEditor.draft.priority}
                        onChange={(event) => updateDraft('priority', event.target.value)}
                      >
                        {priorities.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Due date</label>
                      <Input
                        type="date"
                        value={activeEditor.draft.dueDate}
                        onChange={(event) => updateDraft('dueDate', event.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 sm:pr-1">
                  <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                  <Button size="sm" onClick={submitDraft}>Add Task</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
