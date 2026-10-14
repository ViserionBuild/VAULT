import { useEffect, useRef, useState } from 'react'
import { Dialog } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

/**
 * `initialUrl` pre-fills the field (paste-to-add); the parent remounts the
 * dialog with a new key to apply it. `findExisting(url)` resolves to an
 * already-saved item with that link, or null.
 */
export function AddResourceDialog({ open, onClose, onSubmit, initialUrl = '', findExisting, onShowExisting }) {
  const [url, setUrl] = useState(initialUrl)
  const [existing, setExisting] = useState(null)
  const checkIdRef = useRef(0)

  // Warn, without blocking, when this link is already saved somewhere.
  useEffect(() => {
    const checkId = ++checkIdRef.current
    if (!open || !findExisting || !url.trim()) return
    const timer = setTimeout(async () => {
      const found = await findExisting(url).catch(() => null)
      if (checkId === checkIdRef.current) setExisting(found)
    }, 400)
    return () => clearTimeout(timer)
  }, [open, url, findExisting])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Don't show a stale error the next time the dialog opens.
  const handleClose = () => {
    setError('')
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        // Omitted when blank so the server fills in the page's own title.
        title: title.trim() || undefined,
        url: url.trim(),
        description: description.trim(),
      })
      setUrl('')
      setExisting(null)
      setTitle('')
      setDescription('')
      onClose()
    } catch (err) {
      // Keep the dialog open with the input intact so the user can fix and retry.
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Add Resource">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">URL *</label>
          <Input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setExisting(null)
            }}
            placeholder="example.com/article"
            // Plain text, not type="url": that rejects "github.com" without a
            // scheme. The server adds https:// when it is missing.
            type="text"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            required
          />
          {existing ? (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-300">
              <span className="min-w-0 flex-1">
                Already saved as <strong className="font-semibold">{existing.title}</strong>
                {existing.path ? ` in ${existing.path}` : ''}. You can still add it again.
              </span>
              {onShowExisting && (
                <button
                  type="button"
                  className="shrink-0 font-semibold underline-offset-2 hover:underline"
                  onClick={() => onShowExisting(existing)}
                >
                  Show
                </button>
              )}
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Metadata (title, description, favicon) will be auto-fetched.
            </p>
          )}
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

        {error && (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
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
