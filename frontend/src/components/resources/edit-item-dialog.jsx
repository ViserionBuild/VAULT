import { useState, useEffect } from 'react'
import { Dialog } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

export function EditItemDialog({ open, onClose, item, onSubmit }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (item) {
      setTitle(item.title ?? '')
      setDescription(item.description ?? '')
      setUrl(item.url ?? '')
    }
  }, [item])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const updates = { title: title.trim(), description: description.trim() }
      if (item?.type === 'url') updates.url = url.trim()
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

        {item.type === 'url' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">URL</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} type="url" />
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
