import { useState } from 'react'
import { Dialog } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { DEFAULT_FOLDER_COLOR, FolderAppearancePicker } from './folder-appearance'


export function CreateFolderDialog({ open, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_FOLDER_COLOR)
  const [icon, setIcon] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Don't show a stale error the next time the dialog opens.
  const handleClose = () => {
    setError('')
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await onSubmit({ title: name.trim(), icon, color })
      setName('')
      setColor(DEFAULT_FOLDER_COLOR)
      setIcon('')
      onClose()
    } catch (err) {
      // Keep the dialog open with the input intact so the user can fix and retry.
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Create Folder">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Folder Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Work Resources"
            autoFocus
            required
          />
        </div>

        <FolderAppearancePicker icon={icon} color={color} onIconChange={setIcon} onColorChange={setColor} />

        {error && (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create Folder'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
