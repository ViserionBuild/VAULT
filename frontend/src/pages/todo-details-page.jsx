import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, Check, ChevronLeft, Copy,
  Edit3, ListChecks, Plus, RefreshCw, Trash2,
} from 'lucide-react'

import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { PriorityRating, PRIORITY_LABELS } from '../components/ui/priority-rating'

function formatDate(value) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value),
  )
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



export function TodoDetailsPage({
  currentTodo,
  tasks,
  tasksLoading,
  onEditTodo,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
}) {
  const navigate = useNavigate()
  const [activeEditor, setActiveEditor] = useState(null)

  const startEdit = (task) => {
    setActiveEditor({
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

  const updateDraft = (field, value) => {
    setActiveEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, [field]: value } } : prev))
  }

  const submitDraft = async () => {
    if (!activeEditor?.draft?.title?.trim()) return
    await onUpdateTask(activeEditor.taskId, {
      title: activeEditor.draft.title.trim(),
      description: activeEditor.draft.description?.trim() ?? '',
      priority: Number(activeEditor.draft.priority) || 0,
      dueDate: toApiDate(activeEditor.draft.dueDate),
      completed: Boolean(activeEditor.draft.completed),
    })
    setActiveEditor(null)
  }

  // Group by urgency so the shape of the day is visible at a glance.
  const groups = useMemo(() => {
    const bucket = { overdue: [], today: [], upcoming: [], someday: [] }
    for (const task of tasks.filter((t) => !t.completed)) {
      bucket[dueBucket(task.dueDate)].push(task)
    }
    return { ...bucket, done: tasks.filter((t) => t.completed) }
  }, [tasks])

  const total = tasks.length
  const completed = groups.done.length
  const pct = total ? Math.round((completed / total) * 100) : 0

  const rowProps = (task) => ({
    task,
    editing: activeEditor?.taskId === task.id,
    draft: activeEditor?.draft,
    onDraftChange: updateDraft,
    onStartEdit: () => startEdit(task),
    onCancelEdit: () => setActiveEditor(null),
    onSubmitEdit: submitDraft,
    onToggle: () => onUpdateTask(task.id, { completed: !task.completed }),
    onDelete: () => onDeleteTask(task.id),
    onDuplicate: () => onDuplicateTask(task),
  })

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <div>
        <button
          type="button"
          onClick={() => navigate('/todo')}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> All lists
        </button>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight">
                {currentTodo?.title ?? 'List'}
              </h1>
              {currentTodo?.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{currentTodo.description}</p>
              ) : null}
            </div>
            <Button size="sm" variant="outline" onClick={() => onEditTodo(currentTodo)}>
              <Edit3 className="mr-1.5 h-4 w-4" /> Edit list
            </Button>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {total === 0
                  ? 'No tasks yet'
                  : completed === total
                    ? 'Everything done \u2014 nice work'
                    : `${completed} of ${total} complete`}
              </span>
              <span className="font-semibold">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${
                  total > 0 && completed === total ? 'bg-emerald-500' : 'bg-primary'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <QuickAddTask onCreate={onCreateTask} />

      {tasksLoading && total === 0 && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!tasksLoading && total === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center">
          <ListChecks className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Add your first task above &mdash; a title is all you need.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {SECTIONS.map(({ key, label, tone }) => {
          const bucketTasks = groups[key]
          if (!bucketTasks?.length) return null
          return (
            <div key={key}>
              <h2 className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${tone}`}>
                {label}
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {bucketTasks.length}
                </span>
              </h2>
              <div className="overflow-hidden rounded-xl border border-border">
                {bucketTasks.map((task) => (
                  <TaskRow key={task.id} {...rowProps(task)} />
                ))}
              </div>
            </div>
          )
        })}

        {groups.done.length > 0 && (
          <div>
            <h2 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Completed
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                {groups.done.length}
              </span>
            </h2>
            <div className="overflow-hidden rounded-xl border border-border">
              {groups.done.map((task) => (
                <TaskRow key={task.id} {...rowProps(task)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

const SECTIONS = [
  { key: 'overdue', label: 'Overdue', tone: 'text-rose-500' },
  { key: 'today', label: 'Today', tone: 'text-amber-500' },
  { key: 'upcoming', label: 'Upcoming', tone: 'text-muted-foreground' },
  { key: 'someday', label: 'No date', tone: 'text-muted-foreground' },
]

const PRIORITY_STYLES = {
  1: 'bg-slate-100 text-slate-600',
  2: 'bg-sky-100 text-sky-700',
  3: 'bg-emerald-100 text-emerald-700',
  4: 'bg-amber-100 text-amber-700',
  5: 'bg-rose-100 text-rose-700',
}

function dueBucket(dueDate) {
  if (!dueDate) return 'someday'
  const date = new Date(dueDate)
  if (Number.isNaN(date.getTime())) return 'someday'
  const now = new Date()
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const days = Math.round((b - a) / 86400000)
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  return 'upcoming'
}

/**
 * One-line capture that expands only when more detail is wanted: typing a
 * title and pressing Enter is the whole flow for a simple task.
 */
function QuickAddTask({ onCreate }) {
  const [title, setTitle] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [priority, setPriority] = useState(4)
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setTitle('')
    setPriority(4)
    setDueDate('')
    setDescription('')
    setExpanded(false)
  }

  const submit = async (event) => {
    event?.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: toApiDate(dueDate),
        completed: false,
      })
      reset()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className={`rounded-xl border bg-background p-2 transition-colors ${
        expanded ? 'border-primary/50 shadow-sm' : 'border-border'
      }`}
    >
      <div className="flex items-center gap-2">
        <Plus className="ml-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="Add a task and press Enter"
          aria-label="Task title"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        {title.trim() ? (
          <Button type="submit" size="sm" disabled={saving} className="shrink-0">
            {saving ? 'Adding...' : 'Add'}
          </Button>
        ) : null}
      </div>

      {expanded && (
        <div className="mt-2 grid gap-2 border-t border-border pt-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Priority</span>
            <PriorityRating value={priority} onChange={setPriority} size="sm" />
          </div>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Due date</span>
            <Input
              type="date"
              className="h-9 text-xs"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Note</span>
            <Input
              className="h-9 text-xs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </label>

          <div className="flex justify-end sm:col-span-3">
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}

function TaskRow({
  task, editing, draft, onDraftChange, onStartEdit, onCancelEdit, onSubmitEdit,
  onToggle, onDelete, onDuplicate,
}) {
  const bucket = dueBucket(task.dueDate)
  const priorityLevel = task.priority ?? 0

  if (editing) {
    return (
      <div className="border-b border-border/60 bg-muted/30 p-3 last:border-b-0">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            className="h-9 text-sm sm:col-span-2"
            value={draft?.title ?? ''}
            onChange={(e) => onDraftChange('title', e.target.value)}
            placeholder="Task title"
            autoFocus
          />
          <div className="flex items-center">
            <PriorityRating
              value={draft?.priority ?? 0}
              onChange={(next) => onDraftChange('priority', next)}
              size="sm"
            />
          </div>
          <Input
            type="date"
            className="h-9 text-xs"
            value={draft?.dueDate ?? ''}
            onChange={(e) => onDraftChange('dueDate', e.target.value)}
          />
          <Input
            className="h-9 text-xs sm:col-span-2"
            value={draft?.description ?? ''}
            onChange={(e) => onDraftChange('description', e.target.value)}
            placeholder="Note (optional)"
          />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onCancelEdit}>Cancel</Button>
          <Button size="sm" onClick={onSubmitEdit}>Save</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-2.5 border-b border-border/60 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-muted/40">
      <button
        type="button"
        onClick={onToggle}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        className={`mt-0.5 flex shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          task.completed
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-muted-foreground/40 hover:border-primary'
        }`}
        style={{ height: '1.125rem', width: '1.125rem' }}
      >
        {task.completed && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1 cursor-pointer" onClick={onStartEdit}>
        <div className={`text-sm ${task.completed ? 'text-muted-foreground line-through' : ''}`}>
          {task.title}
        </div>
        {task.description ? (
          <div className="truncate text-xs text-muted-foreground">{task.description}</div>
        ) : null}

        {(task.dueDate || priorityLevel > 0) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {priorityLevel > 0 ? (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_STYLES[priorityLevel]}`}>
                {PRIORITY_LABELS[priorityLevel]}
              </span>
            ) : null}
            {task.dueDate ? (
              <span
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  task.completed
                    ? 'bg-muted text-muted-foreground'
                    : bucket === 'overdue'
                      ? 'bg-rose-100 text-rose-700'
                      : bucket === 'today'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-muted text-muted-foreground'
                }`}
              >
                <CalendarDays className="h-2.5 w-2.5" />
                {formatDate(task.dueDate)}
              </span>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={onDuplicate}
          aria-label="Duplicate task"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete task"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
