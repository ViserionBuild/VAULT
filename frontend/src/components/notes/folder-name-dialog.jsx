import { useState } from 'react'
import { Dialog } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

/**
 * Create or rename a notes folder. The parent remounts it (via `key`) for
 * each use, so `initialName` is applied fresh every time it opens.
 */
export function FolderNameDialog({ open, title, submitLabel, initialName = '', onClose, onSubmit }) {
  const [name, setName] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await onSubmit(name.trim())
      onClose()
    } catch (err) {
      // Keep the dialog open with the name intact so the user can retry.
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="folder-name">
            Folder name
          </label>
          <Input
            id="folder-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Meeting notes"
            autoFocus
            required
          />
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
