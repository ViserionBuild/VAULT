import { useMemo, useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useApi } from '../../hooks/use-api'
import { TAG_COLORS, TagChip } from './tag-chip'
import { useTags } from './use-tags'

/**
 * Tag one item or a selection. Each tag shows whether all, some or none of
 * the items carry it; clicking applies it to all, or removes it if all have
 * it. Changes save immediately. `onChange(tagsByItemId)` reports the result
 * so the caller can update its list without a refetch.
 */
export function TagPickerDialog({ open, items, onClose, onChange }) {
  const api = useApi()
  const { tags, loaded, createTag } = useTags()
  const [filter, setFilter] = useState('')
  const [busyTagId, setBusyTagId] = useState(null)
  const [error, setError] = useState('')
  // Current tags per item, seeded from the items and updated as we go.
  const [tagsByItem, setTagsByItem] = useState(
    () => new Map(items.map((item) => [item.id, item.tags ?? []])),
  )

  const countFor = (tagId) => items.filter((item) => (tagsByItem.get(item.id) ?? []).some((t) => t.id === tagId)).length

  const query = filter.trim()
  const visible = useMemo(
    () => tags.filter((tag) => tag.name.toLowerCase().includes(query.toLowerCase())),
    [tags, query],
  )
  const exactMatch = tags.some((tag) => tag.name.toLowerCase() === query.toLowerCase())

  const apply = async (tag) => {
    const everyone = countFor(tag.id) === items.length
    setBusyTagId(tag.id)
    setError('')
    try {
      const targets = everyone
        ? items
        : items.filter((item) => !(tagsByItem.get(item.id) ?? []).some((t) => t.id === tag.id))
      await Promise.all(
        targets.map((item) =>
          api(`/items/${item.id}/tags/${tag.id}`, { method: everyone ? 'DELETE' : 'POST' }),
        ),
      )
      const next = new Map(tagsByItem)
      for (const item of targets) {
        const current = next.get(item.id) ?? []
        next.set(item.id, everyone ? current.filter((t) => t.id !== tag.id) : [...current, tag])
      }
      setTagsByItem(next)
      onChange?.(next)
    } catch (err) {
      setError(err.message || 'Could not update tags. Please try again.')
    } finally {
      setBusyTagId(null)
    }
  }

  const handleCreate = async () => {
    if (!query || exactMatch) return
    setError('')
    try {
      // Rotate through the palette so new tags are told apart at a glance.
      const tag = await createTag(query, TAG_COLORS[tags.length % TAG_COLORS.length])
      setFilter('')
      await apply(tag)
    } catch (err) {
      setError(err.message || 'Could not create the tag.')
    }
  }

  const subject = items.length === 1 ? `“${items[0].title}”` : `${items.length} items`

  return (
    <Dialog open={open} onClose={onClose} title="Tags">
      <div className="space-y-3">
        <p className="truncate text-sm text-muted-foreground">Tags for {subject}</p>

        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (visible.length === 1 && exactMatch) apply(visible[0])
              else handleCreate()
            }
          }}
          placeholder="Find or create a tag"
          aria-label="Find or create a tag"
          autoFocus
        />

        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {visible.map((tag) => {
            const count = countFor(tag.id)
            const state = count === 0 ? 'none' : count === items.length ? 'all' : 'some'
            return (
              <button
                key={tag.id}
                type="button"
                disabled={busyTagId !== null}
                onClick={() => apply(tag)}
                aria-pressed={state === 'all'}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted disabled:opacity-60"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    state === 'none' ? 'border-border' : 'border-primary bg-primary text-primary-foreground'
                  }`}
                >
                  {state === 'all' && <Check className="h-3 w-3" />}
                  {state === 'some' && <Minus className="h-3 w-3" />}
                </span>
                <TagChip tag={tag} />
                {state === 'some' && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {count} of {items.length}
                  </span>
                )}
              </button>
            )
          })}

          {query && !exactMatch && (
            <button
              type="button"
              onClick={handleCreate}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-primary transition-colors hover:bg-muted"
            >
              <Plus className="h-4 w-4" /> Create tag “{query}”
            </button>
          )}

          {loaded && tags.length === 0 && !query && (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No tags yet. Type a name above to create one.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Dialog>
  )
}
