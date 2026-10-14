import {
  Folder, Star, MoreVertical, NotebookPen, ArrowUp, ArrowDown,
} from 'lucide-react'

// ── shared helpers ────────────────────────────────────────────────
export function stripHtml(html) {
  if (!html) return ''
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDiff = Math.round((startOfToday - startOfDate) / 86400000)
  if (dayDiff === 0) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  if (dayDiff === 1) return 'Yesterday'
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function NoteIcon({ item, size = 'md' }) {
  const color = item.color || item.metadata?.color
  const dims = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  if (item.type === 'folder') {
    return item.icon ? (
      <span className={size === 'lg' ? 'text-2xl leading-none' : 'text-base'} style={color ? { color } : {}}>
        {item.icon}
      </span>
    ) : (
      <Folder
        className={dims}
        style={{ color: color || '#eab308' }}
        fill="currentColor"
        fillOpacity={0.2}
        strokeWidth={1.5}
      />
    )
  }
  return <NotebookPen className={`${dims} text-muted-foreground/70`} strokeWidth={1.5} />
}

function ItemControls({ item, onFavorite, onContextMenu, isSelected, onSelect, stacked }) {
  return (
    <>
      <div
        className={`absolute left-1 top-1 z-10 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 touch:invisible group-data-[selecting=true]/sel:visible group-data-[selecting=true]/sel:opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item.id)}
          className="h-3 w-3 cursor-pointer rounded border-border accent-primary"
          aria-label={`Select ${item.title}`}
        />
      </div>
      <div className={`absolute right-0.5 z-10 flex items-center ${stacked ? 'top-0.5' : 'top-1/2 -translate-y-1/2'}`}>
        <button
          className={`rounded-full p-1 transition-all hover:bg-muted ${
            item.isFavorite
              ? 'text-yellow-400'
              : 'text-muted-foreground opacity-0 hover:text-yellow-400 group-hover:opacity-100 touch:hidden'
          }`}
          onClick={(e) => { e.stopPropagation(); onFavorite(item.id) }}
          aria-label={item.isFavorite ? 'Remove favorite' : 'Add favorite'}
        >
          <Star className="h-2.5 w-2.5" fill={item.isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button
          className="rounded-full p-1 touch:p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100 touch:opacity-100"
          onClick={(e) => { e.stopPropagation(); onContextMenu(e, item) }}
          aria-label="Open menu"
        >
          <MoreVertical className="h-2.5 w-2.5 touch:h-4 touch:w-4" />
        </button>
      </div>
    </>
  )
}

// ── Grid ──────────────────────────────────────────────────────────
export function NoteCard({ item, onOpen, onContextMenu, onFavorite, isSelected, onSelect }) {
  return (
    <div
      className={`group relative flex cursor-pointer flex-col items-center gap-0.5 rounded border border-transparent px-1 pb-1 pt-1.5 transition-colors ${
        isSelected ? 'border-primary/40 bg-primary/10' : 'hover:bg-muted/60'
      }`}
      onClick={() => onOpen(item)}
      onContextMenu={(e) => onContextMenu(e, item)}
      title={item.title}
    >
      <ItemControls
        item={item}
        onFavorite={onFavorite}
        onContextMenu={onContextMenu}
        isSelected={isSelected}
        onSelect={onSelect}
        stacked
      />
      <span className="flex h-9 w-9 items-center justify-center">
        <NoteIcon item={item} size="lg" />
      </span>
      <span className="line-clamp-2 w-full text-center text-[11px] leading-tight">
        {item.title}
      </span>
    </div>
  )
}

// ── List ──────────────────────────────────────────────────────────
const LIST_COLUMNS = [
  { key: 'title', label: 'Name', className: 'flex-1 min-w-0' },
  { key: 'type', label: 'Type', className: 'hidden sm:block w-24 shrink-0' },
  { key: 'updatedAt', label: 'Modified', className: 'hidden md:block w-32 shrink-0' },
]

function SortArrow({ active, sortOrder }) {
  const Icon = active && sortOrder === 'desc' ? ArrowDown : ArrowUp
  return (
    <Icon
      className={`h-3.5 w-3.5 transition-opacity ${
        active ? 'opacity-100 text-primary' : 'opacity-0 group-hover/sort:opacity-40'
      }`}
    />
  )
}

export function NoteListHeader({ onSort, sortBy, sortOrder, allSelected, someSelected, onToggleAll }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
      <span className="flex w-4 shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected }}
          onChange={onToggleAll}
          className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
          aria-label="Select all notes"
        />
      </span>
      <span className="w-8 shrink-0" aria-hidden="true" />
      {LIST_COLUMNS.map((col) => {
        const active = sortBy === col.key
        return (
          <button
            key={col.key}
            type="button"
            onClick={() => onSort(col.key)}
            aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
            className={`group/sort flex items-center gap-1 text-left transition-colors hover:text-foreground ${
              active ? 'text-foreground' : ''
            } ${col.className}`}
          >
            <span className="truncate">{col.label}</span>
            <SortArrow active={active} sortOrder={sortOrder} />
          </button>
        )
      })}
      <span className="w-[60px] shrink-0" aria-hidden="true" />
    </div>
  )
}

export function NoteListItem({ item, onOpen, onContextMenu, onFavorite, isSelected, onSelect }) {
  const preview = item.type === 'note' ? stripHtml(item.content) : item.description
  return (
    <div
      className={`group flex cursor-pointer items-center gap-3 border-b border-border/50 px-3 py-2 transition-colors last:border-b-0 ${
        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
      }`}
      onClick={() => onOpen(item)}
      onContextMenu={(e) => onContextMenu(e, item)}
    >
      <span className="flex w-4 shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item.id)}
          className={`h-4 w-4 cursor-pointer rounded border-border accent-primary transition-opacity ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 touch:invisible group-data-[selecting=true]/sel:visible group-data-[selecting=true]/sel:opacity-100'
          }`}
          aria-label={`Select ${item.title}`}
        />
      </span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">
        <NoteIcon item={item} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.title}</div>
        {preview ? (
          <div className="truncate text-xs text-muted-foreground">{preview}</div>
        ) : null}
      </div>
      <span className="hidden w-24 shrink-0 text-xs text-muted-foreground sm:block">
        {item.type === 'folder' ? 'Folder' : 'Note'}
      </span>
      <span className="hidden w-32 shrink-0 whitespace-nowrap text-xs text-muted-foreground md:block">
        {formatDate(item.updatedAt)}
      </span>
      <div className="flex w-[60px] shrink-0 items-center justify-end gap-0.5">
        <button
          className={`rounded-full p-1.5 transition-all hover:bg-muted ${
            item.isFavorite
              ? 'text-yellow-400'
              : 'text-muted-foreground/40 opacity-0 hover:text-yellow-400 group-hover:opacity-100 touch:hidden'
          }`}
          onClick={(e) => { e.stopPropagation(); onFavorite(item.id) }}
          aria-label={item.isFavorite ? 'Remove favorite' : 'Add favorite'}
        >
          <Star className="h-3.5 w-3.5" fill={item.isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button
          className="rounded-full p-1.5 text-muted-foreground/60 opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100 touch:opacity-100"
          onClick={(e) => { e.stopPropagation(); onContextMenu(e, item) }}
          aria-label="Open menu"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Table (detail) ────────────────────────────────────────────────
export function NoteTable({ items, onOpen, onContextMenu, onFavorite, selectedIds, onSelect, onSort, sortBy, sortOrder }) {
  const columns = [
    { key: 'title', label: 'Name', sortable: true, className: 'min-w-[200px]' },
    { key: 'preview', label: 'Preview', sortable: false, className: 'hidden lg:table-cell' },
    { key: 'updatedAt', label: 'Modified', sortable: true, className: 'hidden sm:table-cell w-36' },
    { key: 'createdAt', label: 'Created', sortable: true, className: 'hidden xl:table-cell w-36' },
  ]

  const allSelected = items.length > 0 && selectedIds.length === items.length
  const someSelected = selectedIds.length > 0 && !allSelected

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="w-10 px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected }}
                onChange={() => onSelect(allSelected ? [] : items.map((i) => i.id))}
                className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                aria-label="Select all notes"
              />
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                aria-sort={sortBy === col.key ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                className={`px-3 py-2 text-left text-xs font-medium text-muted-foreground ${
                  col.sortable ? 'cursor-pointer select-none hover:text-foreground' : ''
                } ${col.className ?? ''}`}
                onClick={() => col.sortable && onSort(col.key)}
              >
                <span className="group/sort flex items-center gap-1">
                  {col.label}
                  {col.sortable && <SortArrow active={sortBy === col.key} sortOrder={sortOrder} />}
                </span>
              </th>
            ))}
            <th className="w-[72px] px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isSelected = selectedIds.includes(item.id)
            const preview = item.type === 'note' ? stripHtml(item.content) : item.description
            return (
              <tr
                key={item.id}
                className={`group cursor-pointer border-b border-border/50 transition-colors last:border-b-0 ${
                  isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                }`}
                onClick={() => onOpen(item)}
                onContextMenu={(e) => onContextMenu(e, item)}
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(
                      isSelected ? selectedIds.filter((id) => id !== item.id) : [...selectedIds, item.id],
                    )}
                    className={`h-4 w-4 cursor-pointer rounded border-border accent-primary transition-opacity ${
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 touch:invisible group-data-[selecting=true]/sel:visible group-data-[selecting=true]/sel:opacity-100'
                    }`}
                    aria-label={`Select ${item.title}`}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      <NoteIcon item={item} size="sm" />
                    </span>
                    <span className="truncate font-medium">{item.title}</span>
                  </div>
                </td>
                <td className="hidden max-w-0 px-3 py-2 text-muted-foreground lg:table-cell">
                  <span className="block truncate">{preview || '—'}</span>
                </td>
                <td className="hidden whitespace-nowrap px-3 py-2 text-muted-foreground sm:table-cell">
                  {formatDate(item.updatedAt)}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-2 text-muted-foreground xl:table-cell">
                  {formatDate(item.createdAt)}
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      className={`rounded-full p-1.5 transition-all hover:bg-muted ${
                        item.isFavorite
                          ? 'text-yellow-400'
                          : 'text-muted-foreground/40 opacity-0 hover:text-yellow-400 group-hover:opacity-100 touch:hidden'
                      }`}
                      onClick={() => onFavorite(item.id)}
                      aria-label={item.isFavorite ? 'Remove favorite' : 'Add favorite'}
                    >
                      <Star className="h-3.5 w-3.5" fill={item.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      className="rounded-full p-1.5 text-muted-foreground/60 opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100 touch:opacity-100"
                      onClick={(e) => onContextMenu(e, item)}
                      aria-label="Open menu"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
