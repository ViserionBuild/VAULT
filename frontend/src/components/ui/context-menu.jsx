import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

export function ContextMenu({ items, position, onClose }) {
  const menuRef = useRef(null)
  const [menuPos, setMenuPos] = useState(position)

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
    if (!position) return
    setMenuPos(position)
  }, [position])

  useEffect(() => {
    if (!position || !menuRef.current) return

    const menuRect = menuRef.current.getBoundingClientRect()
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

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-50 min-w-[180px] rounded-lg border border-border bg-background p-1 shadow-xl',
        'animate-in fade-in zoom-in-95',
      )}
      style={{ top: menuPos.y, left: menuPos.x }}
    >
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
    </div>
  )
}

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState(null)

  const handleContextMenu = (e, data) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, data })
  }

  const closeContextMenu = () => setContextMenu(null)

  return { contextMenu, handleContextMenu, closeContextMenu }
}
