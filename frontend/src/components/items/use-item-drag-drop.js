import { useState } from 'react'

// Private type, so only drags that started on our own items count as moves
// (a link dragged in from another tab carries text/uri-list instead).
const ITEMS_MIME = 'application/x-vault-items'
const ROOT = 'root'

export const isItemDrag = (event) => event.dataTransfer.types.includes(ITEMS_MIME)

/**
 * Drag items onto folders (or breadcrumbs) to move them. Dragging a selected
 * item carries the whole selection. Desktop only: HTML drag and drop does
 * not fire for touch, where the "Move to…" menu covers this.
 */
export function useItemDragDrop({ selectedIds, onMove }) {
  // Folder id being hovered with a drag, or 'root'.
  const [dropTarget, setDropTarget] = useState(null)

  const itemProps = (item) => ({
    draggable: true,
    onDragStart: (event) => {
      const ids = selectedIds.includes(item.id) ? selectedIds : [item.id]
      event.dataTransfer.setData(ITEMS_MIME, JSON.stringify(ids))
      event.dataTransfer.effectAllowed = 'move'
    },
    onDragEnd: () => setDropTarget(null),
  })

  const dropProps = (folderId) => {
    const key = folderId ?? ROOT
    return {
      onDragOver: (event) => {
        if (!isItemDrag(event)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setDropTarget(key)
      },
      onDragLeave: (event) => {
        // Moving between a target's own children fires leave events too.
        if (event.currentTarget.contains(event.relatedTarget)) return
        setDropTarget((current) => (current === key ? null : current))
      },
      onDrop: (event) => {
        if (!isItemDrag(event)) return
        event.preventDefault()
        event.stopPropagation()
        setDropTarget(null)
        // A folder can't be dropped into itself.
        const ids = JSON.parse(event.dataTransfer.getData(ITEMS_MIME)).filter((id) => id !== folderId)
        if (ids.length > 0) onMove(ids, folderId ?? null)
      },
    }
  }

  const isDropTarget = (folderId) => dropTarget === (folderId ?? ROOT)

  return { itemProps, dropProps, isDropTarget }
}
