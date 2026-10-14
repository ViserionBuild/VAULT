// Props shared by every item view (Resources and Notes, in grid, list and
// table form): keyboard access and drag-and-drop wiring.

// Every item is focusable; Enter opens it, Space toggles selection. (Arrow
// keys, Ctrl/Cmd+A, Delete and Escape are handled by useItemShortcuts.)
export const keyboardProps = (item, onOpen, toggleSelect) => ({
  tabIndex: 0,
  'data-item-id': item.id,
  onKeyDown: (event) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter') {
      event.preventDefault()
      onOpen(item)
    } else if (event.key === ' ') {
      event.preventDefault()
      toggleSelect()
    }
  },
})

export const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-primary'

// Drag-and-drop wiring from useItemDragDrop (optional): every item can be
// dragged, and folders also accept drops.
export const dragProps = (dnd, item) =>
  dnd ? { ...dnd.itemProps(item), ...(item.type === 'folder' ? dnd.dropProps(item.id) : {}) } : {}

export const dropHighlight = (dnd, item) =>
  item.type === 'folder' && dnd?.isDropTarget(item.id) ? 'ring-2 ring-primary bg-primary/10' : ''
