import { describe, it, expect, vi } from 'vitest'
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { ToastProvider, useToast } from '../components/ui/toast'
import { usePersistentSort } from '../hooks/use-persistent-sort'
import { useItemShortcuts } from '../hooks/use-item-shortcuts'
import { FolderGlyph } from '../components/resources/folder-appearance'
import { TagChips } from '../components/tags/tag-chip'

function ToastTrigger({ onUndo }) {
  const toast = useToast()
  return <button onClick={() => toast.show({ message: 'Moved to Trash', action: { label: 'Undo', onClick: onUndo } })}>go</button>
}

describe('toasts', () => {
  it('runs the action and dismisses the toast', () => {
    const onUndo = vi.fn()
    render(
      <ToastProvider>
        <ToastTrigger onUndo={onUndo} />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByText('go'))
    expect(screen.getByText('Moved to Trash')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Undo'))
    expect(onUndo).toHaveBeenCalledOnce()
    expect(screen.queryByText('Moved to Trash')).not.toBeInTheDocument()
  })

  it('dismisses itself after a few seconds', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <ToastTrigger onUndo={() => {}} />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByText('go'))
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.queryByText('Moved to Trash')).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})

describe('usePersistentSort', () => {
  it('remembers the choice and toggles a column', () => {
    localStorage.clear()
    const { result, unmount } = renderHook(() => usePersistentSort('test-sort'))
    expect(result.current.sortBy).toBe('position')
    act(() => result.current.changeSort('title', 'asc'))
    act(() => result.current.toggleColumn('title'))
    expect(result.current.sortOrder).toBe('desc')
    unmount()
    const again = renderHook(() => usePersistentSort('test-sort'))
    expect(again.result.current).toMatchObject({ sortBy: 'title', sortOrder: 'desc' })
  })

  it('uses the page default when nothing is saved', () => {
    localStorage.clear()
    const { result } = renderHook(() => usePersistentSort('other', { sortBy: 'updatedAt', sortOrder: 'desc' }))
    expect(result.current).toMatchObject({ sortBy: 'updatedAt', sortOrder: 'desc' })
  })
})

describe('useItemShortcuts', () => {
  const setup = (overrides = {}) => {
    const props = {
      items: [{ id: 'a' }, { id: 'b' }],
      selectedIds: ['a'],
      setSelectedIds: vi.fn(),
      onDeleteSelected: vi.fn(),
      disabled: false,
      ...overrides,
    }
    renderHook(() => useItemShortcuts(props))
    return props
  }

  it('selects all, deletes and clears from the keyboard', () => {
    const props = setup()
    fireEvent.keyDown(document, { key: 'a', ctrlKey: true })
    expect(props.setSelectedIds).toHaveBeenCalledWith(['a', 'b'])
    fireEvent.keyDown(document, { key: 'Delete' })
    expect(props.onDeleteSelected).toHaveBeenCalledOnce()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(props.setSelectedIds).toHaveBeenCalledWith([])
  })

  it('does nothing while typing or when disabled', () => {
    const props = setup()
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 'Delete' })
    expect(props.onDeleteSelected).not.toHaveBeenCalled()
    input.remove()

    const disabled = setup({ disabled: true })
    fireEvent.keyDown(document, { key: 'Delete' })
    expect(disabled.onDeleteSelected).not.toHaveBeenCalled()
  })
})

describe('FolderGlyph', () => {
  it('draws the legacy 📁 and no icon as the tinted folder glyph', () => {
    const { container: legacy } = render(<FolderGlyph icon="📁" color="#10b981" />)
    expect(legacy.querySelector('svg')).toHaveStyle({ color: '#10b981' })
    const { container: none } = render(<FolderGlyph icon="" />)
    expect(none.querySelector('svg')).not.toBeNull()
  })

  it('puts other emoji on a tile tinted with the colour', () => {
    render(<FolderGlyph icon="🚀" color="#3b82f6" />)
    expect(screen.getByText('🚀')).toHaveStyle({ backgroundColor: '#3b82f633' })
  })
})

describe('TagChips', () => {
  it('shows up to the limit, then a count', () => {
    const tags = ['a', 'b', 'c', 'd'].map((name) => ({ id: name, name, color: '#7c3aed' }))
    render(<TagChips tags={tags} max={2} />)
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.queryByText('c')).not.toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
  })
})
