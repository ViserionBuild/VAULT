import { useState } from 'react'
import { Dialog } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

const DEFAULT_FOLDER_COLOR = '#d1d5db'

const FOLDER_COLORS = [
  DEFAULT_FOLDER_COLOR,
  '#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
]

const FOLDER_ICONS = ['📁', '📂', '🗂️', '📋', '📌', '🔖', '💼', '🎯', '🚀', '💡', '📚', '🔬']

export function CreateFolderDialog({ open, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_FOLDER_COLOR)
  const [icon, setIcon] = useState(FOLDER_ICONS[0])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await onSubmit({ title: name.trim(), icon, color })
      setName('')
      setColor(DEFAULT_FOLDER_COLOR)
      setIcon(FOLDER_ICONS[0])
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create Folder">
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

        <div>
          <label className="mb-1.5 block text-sm font-medium">Icon</label>
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

        <div>
          <label className="mb-1.5 block text-sm font-medium">Color</label>
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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
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
