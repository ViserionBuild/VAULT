import { useState } from 'react'
import { Dialog } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

export function AddResourceDialog({ open, onClose, onSubmit }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    try {
      await onSubmit({
        title: title.trim() || extractDomain(url),
        url: url.trim(),
        description: description.trim(),
      })
      setUrl('')
      setTitle('')
      setDescription('')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add Resource">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">URL *</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            type="url"
            autoFocus
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Metadata (title, description, favicon) will be auto-fetched.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Title (optional)</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Leave blank to auto-detect from page"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Description (optional)</label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a note about this resource..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !url.trim()}>
            {loading ? 'Adding...' : 'Add Resource'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function extractDomain(url) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
