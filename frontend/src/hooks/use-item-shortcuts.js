import { useEffect, useRef } from 'react'

/**
 * Page-level keys for item views (ignored while typing or when `disabled`,
 * e.g. a dialog or menu is open): arrows move focus between items,
 * Ctrl/Cmd+A selects all, Delete/Backspace deletes the selection and Escape
 * clears it.
 */
export function useItemShortcuts({ items, selectedIds, setSelectedIds, onDeleteSelected, disabled }) {
  // Latest values for the listener, without re-subscribing it every render.
  const latestRef = useRef(null)
  useEffect(() => {
    latestRef.current = { items, selectedIds, onDeleteSelected }
  })

  useEffect(() => {
    const onKeyDown = (event) => {
      if (disabled) return
      if (event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return
      const { items: current, selectedIds: selected, onDeleteSelected: deleteSelected } = latestRef.current

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        setSelectedIds(current.map((item) => item.id))
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selected.length > 0) {
        event.preventDefault()
        deleteSelected()
      } else if (event.key === 'Escape' && selected.length > 0) {
        setSelectedIds([])
      } else if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
        const nodes = [...document.querySelectorAll('main [data-item-id]')]
        if (nodes.length === 0) return
        event.preventDefault()
        const index = nodes.indexOf(document.activeElement)
        const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
        const next = index === -1 ? 0 : Math.min(nodes.length - 1, Math.max(0, index + step))
        nodes[next].focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [disabled, setSelectedIds])
}
