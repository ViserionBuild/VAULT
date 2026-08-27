import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCheck, ClipboardList, Edit3, MoreVertical,
  Plus, RefreshCw, Search, Trash2, Copy
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

const todoTabs = [
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
]


const priorityOptions = [
  { value: 0, label: 'None', className: 'border-border bg-muted text-muted-foreground' },
  { value: 1, label: 'Whenever', className: 'border-slate-200 bg-slate-100 text-slate-600' },
  { value: 2, label: 'Low', className: 'border-sky-200 bg-sky-100 text-sky-700' },
  { value: 3, label: 'Normal', className: 'border-emerald-200 bg-emerald-100 text-emerald-700' },
  { value: 4, label: 'Important', className: 'border-amber-200 bg-amber-100 text-amber-700' },
  { value: 5, label: 'Urgent', className: 'border-rose-200 bg-rose-100 text-rose-700' },
]




export function TodoListPage({
  todos,
  loading,
  search,
  onSearchChange,
  sortSpec,
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



  const totals = visibleTodos.reduce(
    (acc, todo) => {
      acc.tasks += todo.taskCount ?? 0
      acc.done += todo.completedTaskCount ?? 0
      if (dueStateOf(todo.targetDate) === 'overdue') acc.overdue += 1
      return acc
    },
    { tasks: 0, done: 0, overdue: 0 },
  )
  const overallPct = totals.tasks ? Math.round((totals.done / totals.tasks) * 100) : 0

  return (
    <section className="space-y-5">
      {/* ── Hero: greeting + at-a-glance progress ───────────────── */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{greeting()}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {totals.tasks === 0
                ? 'Nothing on your plate yet — create a list to get started.'
                : totals.done === totals.tasks
                  ? `All ${totals.tasks} tasks done. Enjoy the clear deck.`
                  : `${totals.tasks - totals.done} task${totals.tasks - totals.done === 1 ? '' : 's'} left across ${visibleTodos.length} list${visibleTodos.length === 1 ? '' : 's'}.`}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <StatChip label="Lists" value={visibleTodos.length} />
            <StatChip label="Done" value={`${totals.done}/${totals.tasks}`} />
            {totals.overdue > 0 && (
              <StatChip label="Overdue" value={totals.overdue} tone="danger" />
            )}
            <ProgressRing percent={overallPct} />
          </div>
        </div>
      </div>

      {/* ── Controls ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search lists and tasks"
            className="h-11 rounded-full pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-full border border-border bg-muted/40 p-0.5">
            {todoTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button onClick={onCreateTodo} className="h-11 gap-1.5 rounded-full px-4">
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">New list</span>
          </Button>
        </div>
      </div>

      {/* ── Bulk bar ────────────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onCompleteTodos(selectedIds)}>
              <CheckCheck className="mr-1.5 h-4 w-4" /> Complete
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDeleteTodos(selectedIds)}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onSelectedIdsChange([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* ── Loading / empty ─────────────────────────────────────── */}
      {loading && visibleTodos.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && visibleTodos.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="mb-4 rounded-2xl bg-primary/10 p-5">
            <ClipboardList className="h-10 w-10 text-primary/70" />
          </div>
          <h3 className="text-lg font-semibold">
            {search ? 'No lists match your search' : 'Your first list is a click away'}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {search
              ? 'Try a different term, or clear the search to see everything.'
              : 'Group related tasks into a list — groceries, a project, this week’s errands.'}
          </p>
          {!search && (
            <Button className="mt-5 gap-1.5 rounded-full" onClick={onCreateTodo}>
              <Plus className="h-4 w-4" /> Create a list
            </Button>
          )}
        </div>
      )}

      {/* ── List cards ──────────────────────────────────────────── */}
      {visibleTodos.length > 0 && (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
          {visibleTodos.map((todo) => (
            <TodoListCard
              key={todo.id}
              todo={todo}
              isSelected={selectedIds.includes(todo.id)}
              menuOpen={openMenuId === todo.id}
              onToggleMenu={() => onOpenMenuChange(openMenuId === todo.id ? null : todo.id)}
              onOpen={() => navigate(`/todo/${todo.id}`)}
              onToggleSelect={() =>
                onSelectedIdsChange(
                  selectedIds.includes(todo.id)
                    ? selectedIds.filter((id) => id !== todo.id)
                    : [...selectedIds, todo.id],
                )
              }
              onEdit={() => onEditTodo(todo)}
              onDuplicate={() => onDuplicateTodo(todo)}
              onComplete={() => onCompleteTodos([todo.id])}
              onDelete={() => onDeleteTodos([todo.id])}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function StatChip({ label, value, tone }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold leading-none ${tone === 'danger' ? 'text-rose-500' : ''}`}>
        {value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  )
}

/** Compact SVG ring; no chart dependency for a single number. */
function ProgressRing({ percent, size = 52 }) {
  const stroke = 5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="hsl(var(--primary))" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
        {percent}%
      </span>
    </div>
  )
}

function TodoListCard({
  todo, isSelected, menuOpen, onToggleMenu, onOpen, onToggleSelect,
  onEdit, onDuplicate, onComplete, onDelete,
}) {
  const total = todo.taskCount ?? 0
  const done = todo.completedTaskCount ?? 0
  const pct = total ? Math.round((done / total) * 100) : 0
  const complete = total > 0 && done === total
  const priority = priorityOptions.find((p) => p.value === (todo.priority ?? 0))

  return (
    <div
      className={`group relative flex cursor-pointer flex-col rounded-xl border bg-background p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/40'
      }`}
      onClick={onOpen}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${todo.title}`}
          className={`mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-primary transition-opacity ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        />

        <div className="min-w-0 flex-1">
          <h3 className={`truncate font-semibold ${complete ? 'text-muted-foreground line-through' : ''}`}>
            {todo.title}
          </h3>
          {todo.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{todo.description}</p>
          ) : null}
        </div>

        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label="List actions"
            className="rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border border-border bg-background p-1 shadow-xl">
              <MenuItem icon={Edit3} label="Edit" onClick={onEdit} />
              <MenuItem icon={Copy} label="Duplicate" onClick={onDuplicate} />
              <MenuItem icon={CheckCheck} label="Complete all" onClick={onComplete} />
              <MenuItem icon={Trash2} label="Delete" onClick={onDelete} danger />
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{total === 0 ? 'No tasks yet' : `${done} of ${total} done`}</span>
          <span className="font-medium">{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              complete ? 'bg-emerald-500' : 'bg-primary'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {priority && priority.value > 0 && (
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${priority.className}`}>
            {priority.label}
          </span>
        )}
        {todo.targetDate && (
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              dueStateOf(todo.targetDate) === 'overdue'
                ? 'border-rose-200 bg-rose-100 text-rose-700'
                : dueStateOf(todo.targetDate) === 'today'
                  ? 'border-amber-200 bg-amber-100 text-amber-700'
                  : 'border-border bg-muted text-muted-foreground'
            }`}
          >
            {formatTargetDate(todo.targetDate)}
          </span>
        )}
        {complete && (
          <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            Complete
          </span>
        )}
      </div>
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted ${
        danger ? 'text-red-500 hover:text-red-600' : ''
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

/** Overdue/today/upcoming, derived here since the API does not send it. */
function dueStateOf(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const now = new Date()
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const days = Math.round((b - a) / 86400000)
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  return 'upcoming'
}

function formatTargetDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const days = Math.round((b - a) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days <= 7) return `In ${days}d`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
