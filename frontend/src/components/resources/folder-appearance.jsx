import { Folder } from 'lucide-react'

export const DEFAULT_FOLDER_COLOR = '#eab308'

export const FOLDER_COLORS = [
  DEFAULT_FOLDER_COLOR, '#d1d5db',
  '#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
]

// '' is the plain folder glyph, drawn in the folder's colour. Emoji can't be
// recoloured, so they sit on a tile tinted with it instead.
export const FOLDER_ICONS = ['', '📂', '🗂️', '📋', '📌', '🔖', '💼', '🎯', '🚀', '💡', '📚', '🔬']

const SIZES = {
  lg: { glyph: 'h-8 w-8', tile: 'h-8 w-8 rounded-lg text-xl' },
  md: { glyph: 'h-5 w-5', tile: 'h-7 w-7 rounded-md text-base' },
  sm: { glyph: 'h-4 w-4', tile: 'h-5 w-5 rounded text-xs' },
}

/** A folder's icon in its colour: tinted glyph, or emoji on a tinted tile. */
export function FolderGlyph({ icon, color, size = 'md' }) {
  const tone = color || DEFAULT_FOLDER_COLOR
  const s = SIZES[size]

  // Older folders were created with 📁 by default; treat it as the glyph so
  // their chosen colour finally shows.
  if (!icon || icon === '📁') {
    return (
      <Folder
        className={`${s.glyph} shrink-0`}
        style={{ color: tone }}
        fill="currentColor"
        fillOpacity={0.2}
        strokeWidth={1.5}
      />
    )
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center leading-none ${s.tile}`}
      style={{ backgroundColor: `${tone}33` }}
    >
      {icon}
    </span>
  )
}

/** Icon and colour pickers shared by the create and edit folder dialogs. */
export function FolderAppearancePicker({ icon, color, onIconChange, onColorChange }) {
  return (
    <>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Icon</label>
        <div className="flex flex-wrap gap-2">
          {FOLDER_ICONS.map((ic) => (
            <button
              key={ic || 'folder'}
              type="button"
              onClick={() => onIconChange(ic)}
              aria-label={ic ? `Icon ${ic}` : 'Plain folder'}
              aria-pressed={icon === ic}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                icon === ic ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-muted'
              }`}
            >
              <FolderGlyph icon={ic} color={color} size="md" />
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
              onClick={() => onColorChange(c)}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              className={`h-8 w-8 rounded-full transition-all ${
                color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </>
  )
}
