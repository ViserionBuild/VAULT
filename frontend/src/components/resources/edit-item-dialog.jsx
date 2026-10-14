import { useState, useEffect } from 'react'
import { Dialog } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { DEFAULT_FOLDER_COLOR, FolderAppearancePicker } from './folder-appearance'


export function EditItemDialog({ open, onClose, item, onSubmit }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState(DEFAULT_FOLDER_COLOR)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Don't show a stale error the next time the dialog opens.
  const handleClose = () => {
    setError('')
    onClose()
  }

  useEffect(() => {
    if (item) {
      setTitle(item.title ?? '')
      setDescription(item.description ?? '')
      setUrl(item.url ?? '')
      // Legacy default emoji is shown as the plain folder glyph.
      setIcon(item.type === 'folder' && item.icon === '📁' ? '' : item.icon ?? '')
      setColor(item.color || item.metadata?.color || DEFAULT_FOLDER_COLOR)
    }
  }, [item])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError('')
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
    } catch (err) {
      // Keep the dialog open with the input intact so the user can fix and retry.
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={open} onClose={handleClose} title={`Edit ${item.type === 'folder' ? 'Folder' : 'Resource'}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </div>

        {item.type === 'folder' && (
          <FolderAppearancePicker icon={icon} color={color} onIconChange={setIcon} onColorChange={setColor} />
        )}

        {item.type === 'url' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">URL</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="text"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
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

        {error && (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
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
