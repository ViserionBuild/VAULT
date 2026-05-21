import { useState, useEffect } from 'react'
import { Dialog } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

const FOLDER_COLORS = [
  '#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
]

const FOLDER_ICONS = ['📁', '📂', '🗂️', '📋', '📌', '🔖', '💼', '🎯', '🚀', '💡', '📚', '🔬']

export function EditItemDialog({ open, onClose, item, onSubmit }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState(FOLDER_COLORS[0])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (item) {
      setTitle(item.title ?? '')
      setDescription(item.description ?? '')
      setUrl(item.url ?? '')
      setIcon(item.icon ?? '')
      setColor(item.metadata?.color ?? FOLDER_COLORS[0])
    }
  }, [item])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const updates = { title: title.trim(), description: description.trim() }
      if (item?.type === 'url') {
        updates.url = url.trim()
        updates.icon = icon.trim()
      } else {
        updates.icon = icon.trim()
        updates.color = color
        updates.metadata = { ...(item.metadata ?? {}), color }
      }
      await onSubmit(item.id, updates)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={open} onClose={onClose} title={`Edit ${item.type === 'folder' ? 'Folder' : 'Resource'}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </div>

        {item.type === 'folder' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">Folder Icon</label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all ${
                    icon === ic
                      ? 'bg-primary/20 ring-2 ring-primary scale-110'
                      : 'hover:bg-muted'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
        )}

        {item.type === 'folder' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">Folder Color</label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}

        {item.type === 'url' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">URL</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} type="url" />
          </div>
        )}

        {item.type === 'url' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">Icon (optional)</label>
            <Input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Emoji or icon URL"
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium">Description</label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !title.trim()}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
