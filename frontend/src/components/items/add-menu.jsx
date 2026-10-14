import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useIsMobile } from '../../hooks/use-media-query'

export const canReadClipboard = typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.readText)

/**
 * One "+" for everything that can be added here. A dropdown under the header
 * button on larger screens; a floating button with a speed dial on phones.
 * Press N to open it, then an option's key (or arrows and Enter).
 *
 * `tip`: optional footer line in the dropdown.
 * `options`: [{ id, key, label, hint, icon, tile (gradient classes), onSelect }]
 */
export function AddMenu({ options, locationName, tip, disabled, hideFab }) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const fabRef = useRef(null)

  const choose = (id) => {
    setOpen(false)
    options.find((option) => option.id === id)?.onSelect()
  }
  const close = ({ refocus = false } = {}) => {
    setOpen(false)
    if (refocus) (isMobile ? fabRef : triggerRef).current?.focus()
  }

  // N opens the menu from anywhere on the page (not while typing).
  useEffect(() => {
    const onKeyDown = (event) => {
      if (disabled || open || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key.toLowerCase() !== 'n') return
      if (event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      setOpen(true)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [disabled, open])

  // Focus the first option on open; close on a click elsewhere.
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      rootRef.current?.querySelector('[role="menuitem"]')?.focus()
    })
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  const onMenuKeyDown = (event) => {
    // Keep the page's own shortcuts (arrows between items, Escape) out of it.
    event.stopPropagation()
    const items = [...rootRef.current.querySelectorAll('[role="menuitem"]')]
    const index = items.indexOf(document.activeElement)
    const option = options.find((o) => o.key === event.key.toLowerCase())
    if (event.key === 'Escape') {
      event.preventDefault()
      close({ refocus: true })
    } else if (event.key === 'Tab') {
      close()
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      // The phone dial lists options bottom-up, so arrows follow the screen.
      const step = (event.key === 'ArrowDown') === !isMobile ? 1 : -1
      items[(index + step + items.length) % items.length]?.focus()
    } else if (option && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      choose(option.id)
    }
  }

  const plusIcon = (className) => (
    <Plus
      className={`${className} transition-transform duration-300 ease-out ${open ? 'rotate-[135deg]' : ''}`}
      strokeWidth={2.5}
    />
  )

  return (
    <div ref={rootRef} onKeyDown={open ? onMenuKeyDown : undefined}>
      {/* Header button and dropdown (md and up) */}
      <div className="relative hidden md:block">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open && !isMobile}
          title="New (N)"
          className={`group inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-br from-primary to-primary/80 pl-2.5 pr-3.5 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            open ? 'shadow-lg shadow-primary/30' : ''
          }`}
        >
          {plusIcon('h-4 w-4')}
          New
        </button>

        {open && !isMobile && (
          <div
            role="menu"
            aria-label="Add"
            className="absolute right-0 top-full z-50 mt-2 w-80 origin-top-right rounded-xl border border-border bg-background p-1.5 shadow-2xl animate-in zoom-in-95"
          >
            <p className="truncate px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Add to {locationName}
            </p>
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitem"
                onClick={() => choose(option.id)}
                className="group/opt flex w-full items-center gap-3 rounded-lg p-2 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${option.tile} text-white shadow-sm transition-transform duration-200 group-hover/opt:scale-110 group-hover/opt:-rotate-6 group-focus-visible/opt:scale-110 group-focus-visible/opt:-rotate-6`}
                >
                  <option.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{option.hint}</span>
                </span>
                <kbd className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-sans text-[10px] font-medium uppercase text-muted-foreground">
                  {option.key}
                </kbd>
              </button>
            ))}
            {tip && (
              <p className="mt-1 border-t border-border px-2.5 pb-1 pt-2 text-[11px] text-muted-foreground">
                {tip}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Floating button with a speed dial (phones) */}
      <div className="md:hidden">
        {open && isMobile && (
          <div
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm animate-in fade-in"
            onClick={() => close()}
            aria-hidden="true"
          />
        )}

        <div
          className={`fixed right-4 z-50 flex flex-col items-end gap-3 transition-all duration-200 bottom-[calc(5rem+env(safe-area-inset-bottom))] ${
            hideFab && !open ? 'pointer-events-none translate-y-4 opacity-0' : ''
          }`}
        >
          {open && isMobile && (
            <div role="menu" aria-label="Add" className="flex flex-col items-end gap-3">
              <p className="mr-1 max-w-[70vw] truncate text-xs font-medium text-muted-foreground animate-in fade-in">
                Add to {locationName}
              </p>
              {options.map((option, i) => (
                <button
                  key={option.id}
                  type="button"
                  role="menuitem"
                  onClick={() => choose(option.id)}
                  style={{ animationDelay: `${(options.length - 1 - i) * 40}ms` }}
                  className="flex items-center gap-3 outline-none animate-in slide-in-from-bottom-4"
                >
                  <span className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium shadow-lg">
                    {option.label}
                  </span>
                  <span
                    className={`mr-1 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${option.tile} text-white shadow-lg active:scale-95`}
                  >
                    <option.icon className="h-5 w-5" />
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            ref={fabRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open && isMobile}
            aria-label={open ? 'Close' : 'Add'}
            tabIndex={hideFab && !open ? -1 : 0}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl shadow-primary/30 transition-transform active:scale-95"
          >
            {plusIcon('h-6 w-6')}
          </button>
        </div>
      </div>
    </div>
  )
}
