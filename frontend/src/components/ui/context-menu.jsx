import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'
import { useIsMobile } from '../../hooks/use-media-query'

/**
 * Right-click / "⋮" menu. `header` (optional) is shown above the actions,
 * e.g. an item's details; without it, phones show the item's title.
 */
export function ContextMenu({ items, position, onClose, header }) {
  const menuRef = useRef(null)
  const [menuPos, setMenuPos] = useState(position)
  // A new position (menu reopened elsewhere) resets the placement; the effect
  // below then nudges it on-screen once measured.
  const [placedFor, setPlacedFor] = useState(position)
  if (position && position !== placedFor) {
    setPlacedFor(position)
    setMenuPos(position)
  }
  const isMobile = useIsMobile()

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('contextmenu', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('contextmenu', handler)
    }
  }, [onClose])

  useEffect(() => {
    if (!position || !menuRef.current) return

    // offsetWidth/Height ignore the zoom-in animation's transform, which
    // would otherwise under-measure the menu and let it spill off-screen.
    const menuRect = { width: menuRef.current.offsetWidth, height: menuRef.current.offsetHeight }
    const padding = 8
    const maxLeft = window.innerWidth - menuRect.width - padding
    const maxTop = window.innerHeight - menuRect.height - padding
    const nextLeft = Math.min(Math.max(position.x, padding), Math.max(padding, maxLeft))
    const nextTop = Math.min(Math.max(position.y, padding), Math.max(padding, maxTop))

    if (nextLeft !== position.x || nextTop !== position.y) {
      setMenuPos({ x: nextLeft, y: nextTop })
    }
  }, [position])

  if (!position || !menuPos) return null

  // Phones: an action sheet from the bottom with full-width, thumb-sized rows,
  // instead of a small popup anchored under the finger.
  // Rendered into <body>: inside the page, layout styles such as a parent's
  // space-y margin would offset the fixed-position menu.
  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-end bg-black/50 animate-in fade-in">
        <div
          ref={menuRef}
          className="w-full rounded-t-2xl border-t border-border bg-background p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-in sheet-in"
          role="menu"
        >
          <div aria-hidden="true" className="mx-auto mb-2 mt-1 h-1 w-10 rounded-full bg-muted-foreground/30" />
          {header ? (
            <div className="mb-1 border-b border-border px-2 pb-2">{header}</div>
          ) : (
            position.data?.title && (
              <p className="truncate px-4 pb-2 text-sm font-medium text-muted-foreground">
                {position.data.title}
              </p>
            )
          )}
          {items.map((item, idx) =>
            item.separator ? (
              <div key={idx} className="my-1 h-px bg-border" />
            ) : (
              <button
                key={idx}
                role="menuitem"
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-base transition-colors active:bg-muted',
                  item.danger && 'text-red-500',
                )}
                onClick={() => {
                  item.onClick()
                  onClose()
                }}
                disabled={item.disabled}
              >
                {item.icon && <item.icon className="h-5 w-5" />}
                {item.label}
              </button>
            ),
          )}
          <button
            className="mt-1 w-full rounded-lg bg-muted px-4 py-3.5 text-base font-medium active:bg-muted/70"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div
      ref={menuRef}
      className={cn(
        'fixed z-50 min-w-[180px] rounded-lg border border-border bg-background p-1 shadow-xl',
        'animate-in fade-in zoom-in-95',
        header && 'w-72',
      )}
      style={{ top: menuPos.y, left: menuPos.x }}
    >
      {header && <div className="mb-1 border-b border-border pb-1">{header}</div>}
      {items.map((item, idx) =>
        item.separator ? (
          <div key={idx} className="my-1 h-px bg-border" />
        ) : (
          <button
            key={idx}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              'hover:bg-muted',
              item.danger && 'text-red-500 hover:text-red-400',
            )}
            onClick={() => {
              item.onClick()
              onClose()
            }}
            disabled={item.disabled}
          >
            {item.icon && <item.icon className="h-4 w-4" />}
            {item.label}
          </button>
        ),
      )}
    </div>,
    document.body,
  )
}

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState(null)

  const handleContextMenu = (e, data) => {
    e.preventDefault()
    // Opened from the keyboard (Enter on the "⋮" button) there's no pointer
    // position, so open under the button instead of the screen's corner.
    if (!e.clientX && !e.clientY && e.currentTarget?.getBoundingClientRect) {
      const rect = e.currentTarget.getBoundingClientRect()
      setContextMenu({ x: rect.left, y: rect.bottom + 4, data })
      return
    }
    setContextMenu({ x: e.clientX, y: e.clientY, data })
  }

  const closeContextMenu = () => setContextMenu(null)

  return { contextMenu, handleContextMenu, closeContextMenu }
}
