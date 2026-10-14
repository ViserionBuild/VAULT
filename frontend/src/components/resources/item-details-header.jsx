import { Pencil } from 'lucide-react'
import { TagChips } from '../tags/tag-chip'

/**
 * Details shown at the top of an item's "⋮" menu: title, link and the full
 * description (scrolls when long). Offers to add a description when empty.
 */
export function ItemDetailsHeader({ item, onAddDescription }) {
  const description = item.description?.trim()

  return (
    <div className="space-y-1.5 px-3 py-2 text-left">
      <p className="break-words text-sm font-semibold leading-snug">{item.title}</p>
      {item.url && (
        <p className="truncate text-xs text-muted-foreground" title={item.url}>
          {item.url.replace(/^https?:\/\/(www\.)?/, '')}
        </p>
      )}
      {description ? (
        <p className="max-h-32 overflow-y-auto whitespace-pre-line break-words text-xs leading-relaxed text-foreground/80">
          {description}
        </p>
      ) : (
        <button
          type="button"
          onClick={onAddDescription}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          <Pencil className="h-3 w-3" /> Add a description
        </button>
      )}
      {item.tags?.length > 0 && <TagChips tags={item.tags} max={4} />}
    </div>
  )
}
