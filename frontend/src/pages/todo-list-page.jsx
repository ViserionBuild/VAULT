import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDown, ArrowUp, CheckCheck, ClipboardList, Edit3, MoreVertical,
  Plus, RefreshCw, Search, Trash2, Copy
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

const todoTabs = [
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
]

const listSortOptions = [
  { value: 'title', label: 'Name' },
  { value: 'completion', label: 'Completion %' },
  { value: 'priority', label: 'Priority' },
  { value: 'targetDate', label: 'Target date' },
  { value: 'updatedAt', label: 'Date modified' },
  { value: 'createdAt', label: 'Date created' },
  { value: 'taskCount', label: 'Task count' },
]

const priorityOptions = [
  { value: 0, label: 'None', className: 'border-border bg-muted text-muted-foreground' },
  { value: 1, label: 'Low', className: 'border-emerald-200 bg-emerald-100 text-emerald-700' },
  { value: 2, label: 'Medium', className: 'border-amber-200 bg-amber-100 text-amber-700' },
  { value: 3, label: 'High', className: 'border-rose-200 bg-rose-100 text-rose-700' },
]

function formatDate(value) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value),
  )
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getTargetDateStyle(value, isCompleted) {
  if (!value) return { label: '—', className: 'text-muted-foreground' }

  const dateValue = new Date(value)
  if (Number.isNaN(dateValue.getTime())) {
    return { label: '—', className: 'text-muted-foreground' }
  }

  const today = startOfDay(new Date())
  const targetDay = startOfDay(dateValue)

  if (targetDay.getTime() === today.getTime()) {
    return { label: formatDate(value), className: 'text-emerald-700' }
  }

  if (targetDay < today) {
    return {
      label: formatDate(value),
      className: isCompleted ? 'text-muted-foreground' : 'text-rose-600',
    }
  }

  return { label: formatDate(value), className: 'text-muted-foreground' }
}

export function TodoListPage({
  todos,
  loading,
  search,
  onSearchChange,
  sortSpec,
  onSortChange,
  activeTab,
  onTabChange,
  selectedIds,
  onSelectedIdsChange,
  openMenuId,
  onOpenMenuChange,
  onCreateTodo,
  onEditTodo,
  onCompleteTodos,
  onDeleteTodos,
  onDuplicateTodo,
}) {
  const navigate = useNavigate()

  const normalizedSearch = String(search ?? '').trim().toLowerCase()

  const visibleTodos = useMemo(() => {
    const filtered = todos.filter((todo) => {
      const matchesSearch = !normalizedSearch || `${todo.title ?? ''} ${todo.description ?? ''} ${todo.taskSearchText ?? ''}`
        .toLowerCase()
        .includes(normalizedSearch)
      if (!matchesSearch) return false
      if (activeTab === 'completed') return todo.completed
      if (activeTab === 'pending') return !todo.completed
      return true
    })

    const sorted = [...filtered].sort((a, b) => {
      const entries = sortSpec.length > 0 ? sortSpec : [{ key: 'updatedAt', order: 'desc' }]

      for (const entry of entries) {
        let result
        if (entry.key === 'title') {
          result = a.title.localeCompare(b.title)
        } else if (entry.key === 'taskCount') {
          result = (a.taskCount ?? 0) - (b.taskCount ?? 0)
        } else if (entry.key === 'completion') {
          const aTotal = a.taskCount ?? 0
          const bTotal = b.taskCount ?? 0
          const aPercent = aTotal > 0 ? Math.round((a.completedTaskCount / aTotal) * 100) : 0
          const bPercent = bTotal > 0 ? Math.round((b.completedTaskCount / bTotal) * 100) : 0
          result = aPercent - bPercent
        } else if (entry.key === 'priority') {
          result = (a.priority ?? 0) - (b.priority ?? 0)
        } else if (entry.key === 'targetDate') {
          const aValue = a.targetDate ? new Date(a.targetDate).getTime() : 0
          const bValue = b.targetDate ? new Date(b.targetDate).getTime() : 0
          result = aValue - bValue
        } else {
          const aValue = new Date(a[entry.key] ?? 0).getTime()
          const bValue = new Date(b[entry.key] ?? 0).getTime()
          result = aValue - bValue
        }

        if (result !== 0) {
          return entry.order === 'desc' ? -result : result
        }
      }

      return 0
    })

    return sorted
  }, [todos, activeTab, normalizedSearch, sortSpec])

  const applySort = (key, event) => {
    onSortChange(key, { additive: Boolean(event?.shiftKey) })
  }

  const sortLabel = sortSpec
    .map((entry) => {
      const label = listSortOptions.find((option) => option.value === entry.key)?.label ?? entry.key
      return `${label} (${entry.order})`
    })
    .join(', ') || 'Date modified (desc)'

  const getSortIndicator = (key) => {
    const index = sortSpec.findIndex((entry) => entry.key === key)
    if (index === -1) return null
    const entry = sortSpec[index]
    return (
      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
        {entry.order === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
        <span>{index + 1}</span>
      </span>
    )
  }

  return (
    <section className="space-y-4">
      <div className="sticky top-14 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0 lg:w-44">
            <h1 className="text-2xl font-bold tracking-tight">TODO</h1>
          </div>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search TODOs"
              className="h-11 rounded-full bg-muted/60 pl-11"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={selectedIds.length === 0}
              onClick={() => onCompleteTodos(selectedIds)}
            >
              <CheckCheck className="mr-1.5 h-4 w-4" /> Complete
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedIds.length === 0}
              onClick={() => onDeleteTodos(selectedIds)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
            <Button size="sm" onClick={() => onCreateTodo()}>
              <Plus className="mr-1.5 h-4 w-4" /> New TODO
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-2">
          <div className="flex items-center gap-2">
            {todoTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            Sorted by <span className="font-medium text-foreground">{sortLabel}</span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && visibleTodos.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <h3 className="font-semibold">No TODOs found</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create a TODO or switch filters.</p>
          <Button className="mt-4" onClick={() => onCreateTodo()}>
            <Plus className="mr-1.5 h-4 w-4" /> New TODO
          </Button>
        </div>
      )}

      {!loading && visibleTodos.length > 0 && (
        <div className="overflow-visible rounded-lg border border-border bg-card">
          <div className="hidden grid-cols-[2.75rem_minmax(16rem,1.4fr)_minmax(12rem,1fr)_7.5rem_9.5rem_9rem_9rem_9rem_3rem] items-center gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground md:grid">
            <input
              type="checkbox"
              checked={visibleTodos.length > 0 && visibleTodos.every((todo) => selectedIds.includes(todo.id))}
              onChange={(event) => {
                onSelectedIdsChange(event.target.checked ? visibleTodos.map((todo) => todo.id) : [])
              }}
              className="h-4 w-4 rounded border-border"
            />
            <button
              className="flex items-center gap-1 pl-6 text-left text-foreground"
              onClick={(event) => applySort('title', event)}
            >
              Name
              {getSortIndicator('title')}
            </button>
            <div className="text-left whitespace-nowrap">Description</div>
            <button
              className="flex items-center gap-1 text-left whitespace-nowrap"
              onClick={(event) => applySort('priority', event)}
            >
              Priority
              {getSortIndicator('priority')}
            </button>
            <button
              className="flex items-center gap-1 text-left whitespace-nowrap"
              onClick={(event) => applySort('targetDate', event)}
            >
              Target date
              {getSortIndicator('targetDate')}
            </button>
            <button
              className="flex items-center gap-1 text-left whitespace-nowrap"
              onClick={(event) => applySort('completion', event)}
            >
              Completion %
              {getSortIndicator('completion')}
            </button>
            <button
              className="flex items-center gap-1 text-left whitespace-nowrap"
              onClick={(event) => applySort('updatedAt', event)}
            >
              Date modified
              {getSortIndicator('updatedAt')}
            </button>
            <button
              className="flex items-center gap-1 text-left whitespace-nowrap"
              onClick={(event) => applySort('createdAt', event)}
            >
              Date created
              {getSortIndicator('createdAt')}
            </button>
            <div className="text-right"></div>
          </div>

          <div className="divide-y divide-border">
            {visibleTodos.map((todo) => (
              <div
                key={todo.id}
                className="group grid cursor-pointer grid-cols-[2rem_minmax(0,1fr)_2.5rem] gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 md:grid-cols-[2.75rem_minmax(16rem,1.4fr)_minmax(12rem,1fr)_7.5rem_9.5rem_9rem_9rem_9rem_3rem] md:items-center"
                onClick={() => navigate(`/todo/${todo.id}`)}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(todo.id)}
                  onChange={(event) => {
                    event.stopPropagation()
                    onSelectedIdsChange((prev) =>
                      prev.includes(todo.id) ? prev.filter((id) => id !== todo.id) : [...prev, todo.id],
                    )
                  }}
                  onClick={(event) => event.stopPropagation()}
                  className="h-4 w-4 rounded border-border"
                />

                <div className="min-w-0 pl-1">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 shrink-0 text-primary" />
                    <h2 className="truncate text-sm font-medium">{todo.title}</h2>
                  </div>
                  <div className="mt-3 md:hidden">
                    <p className="line-clamp-1 text-xs text-muted-foreground">{todo.description || '—'}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{todo.completed ? 'Completed' : 'Pending'}</span>
                      <span>
                        {todo.taskCount > 0
                          ? `${Math.round((todo.completedTaskCount / todo.taskCount) * 100)}% complete`
                          : '0% complete'}
                      </span>
                      <span>Modified {formatDate(todo.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden min-w-0 text-sm text-muted-foreground md:block">
                  <span className="truncate whitespace-nowrap">{todo.description || '—'}</span>
                </div>
                <div className="hidden md:block">
                  {(() => {
                    const priority = priorityOptions.find((option) => option.value === Number(todo.priority))
                      ?? priorityOptions[0]
                    return (
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${priority.className}`}>
                        {priority.label}
                      </span>
                    )
                  })()}
                </div>
                <div className="hidden text-sm md:block">
                  {(() => {
                    const target = getTargetDateStyle(todo.targetDate, todo.completed)
                    return (
                      <span className={`whitespace-nowrap ${target.className}`}>{target.label}</span>
                    )
                  })()}
                </div>
                <div className="hidden md:block">
                  {(() => {
                    const total = todo.taskCount ?? 0
                    const completed = todo.completedTaskCount ?? 0
                    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
                    const colorClass = percent === 100
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                      : percent < 50
                        ? 'border-rose-200 bg-rose-100 text-rose-700'
                        : 'border-amber-200 bg-amber-100 text-amber-700'

                    return (
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
                        {percent}%
                      </span>
                    )
                  })()}
                </div>
                <div className="hidden text-sm text-muted-foreground md:block whitespace-nowrap">{formatDate(todo.updatedAt)}</div>
                <div className="hidden text-sm text-muted-foreground md:block whitespace-nowrap">{formatDate(todo.createdAt)}</div>
                <div className="relative flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpenMenuChange((current) => (current === todo.id ? null : todo.id))
                    }}
                    title="More actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  {openMenuId === todo.id && (
                    <div
                      className="absolute right-0 top-9 z-30 w-44 rounded-md border border-border bg-background p-1 shadow-xl"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          onEditTodo(todo)
                          onOpenMenuChange(null)
                        }}
                      >
                        <Edit3 className="h-4 w-4" /> Edit
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => onCompleteTodos([todo.id])}
                      >
                        <CheckCheck className="h-4 w-4" /> Mark completed
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => onDuplicateTodo(todo)}
                      >
                        <Copy className="h-4 w-4" /> Duplicate
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-destructive hover:bg-muted"
                        onClick={() => onDeleteTodos([todo.id])}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
