import { X } from 'lucide-react'

export const TAG_COLORS = [
  '#7c3aed', '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#eab308', '#f97316', '#ef4444', '#ec4899', '#64748b',
]

/** A tag's name on a pill tinted with its colour; optional remove button. */
export function TagChip({ tag, onRemove, size = 'sm', className = '' }) {
  const color = tag.color || TAG_COLORS[0]
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border font-medium ${
        size === 'xs' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs'
      } ${className}`}
      style={{ backgroundColor: `${color}1f`, borderColor: `${color}55`, color }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onRemove(tag)
          }}
          aria-label={`Remove tag ${tag.name}`}
          className="-mr-0.5 rounded-full p-0.5 hover:bg-black/10"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

/** Up to `max` chips, then "+N". */
export function TagChips({ tags, max = 3, size = 'xs' }) {
  if (!tags || tags.length === 0) return null
  const shown = tags.slice(0, max)
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1">
      {shown.map((tag) => (
        <TagChip key={tag.id} tag={tag} size={size} />
      ))}
      {tags.length > max && <span className="text-[10px] text-muted-foreground">+{tags.length - max}</span>}
    </span>
  )
}
