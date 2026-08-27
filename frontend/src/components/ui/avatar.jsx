import { useState } from 'react'
import { cn } from '../../lib/utils'

/**
 * Profile picture with an initial-letter fallback. Falls back on load error
 * too, so a dead image URL never leaves an empty circle.
 */
export function Avatar({ user, profile, className }) {
  const [failed, setFailed] = useState(false)
  const src = profile?.avatarUrl
  const initial = (profile?.displayName || user?.name || '?').charAt(0).toUpperCase()

  const base = cn(
    'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary',
    className,
  )

  if (src && !failed) {
    return (
      <span className={base}>
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </span>
    )
  }

  return <span className={base}>{initial}</span>
}
