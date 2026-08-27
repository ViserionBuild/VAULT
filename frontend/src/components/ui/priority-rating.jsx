import { useState } from 'react'
import { Star } from 'lucide-react'

const LABELS = {
  1: 'Whenever',
  2: 'Low',
  3: 'Normal',
  4: 'Important',
  5: 'Urgent',
}

// Cool for low priority, warm for high — colour carries the meaning at a glance.
const TONES = {
  1: 'text-slate-400',
  2: 'text-sky-500',
  3: 'text-emerald-500',
  4: 'text-amber-500',
  5: 'text-rose-500',
}

/**
 * Five-star priority picker. Replaces a dropdown that required opening a menu
 * and reading labels; here the level is one click and readable at a glance.
 */
export function PriorityRating({ value = 4, onChange, size = 'md' }) {
  const [hovered, setHovered] = useState(0)
  const shown = hovered || value
  const starSize = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHovered(0)}
        role="radiogroup"
        aria-label="Priority"
      >
        {[1, 2, 3, 4, 5].map((level) => {
          const filled = level <= shown
          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={value === level}
              aria-label={`${LABELS[level]} priority`}
              title={LABELS[level]}
              onMouseEnter={() => setHovered(level)}
              // Clicking the current level clears it back to unset.
              onClick={() => onChange(value === level ? 0 : level)}
              className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Star
                className={`${starSize} transition-colors ${
                  filled ? TONES[shown] : 'text-muted-foreground/25'
                }`}
                fill={filled ? 'currentColor' : 'none'}
                strokeWidth={1.5}
              />
            </button>
          )
        })}
      </div>

      <span className={`text-xs font-medium ${value ? TONES[value] : 'text-muted-foreground'}`}>
        {value ? LABELS[value] : 'No priority'}
      </span>
    </div>
  )
}

export const PRIORITY_LABELS = LABELS
export const PRIORITY_TONES = TONES
