import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FolderPlus, Plus, RefreshCw, Pencil, Trash2, Star,
  FolderInput, BookMarked, NotebookPen, CheckSquare,
} from 'lucide-react'
import { useApi } from '../hooks/use-api'
import { useWorkspace } from '../contexts/workspace-context'
import { useFolderParam } from '../hooks/use-folder-param'
import { usePersistentSort } from '../hooks/use-persistent-sort'
import { useItemShortcuts } from '../hooks/use-item-shortcuts'
import { Button } from '../components/ui/button'
import { useToast } from '../components/ui/toast'
import { Breadcrumbs } from '../components/resources/breadcrumbs'
import { ContextMenu, useContextMenu } from '../components/ui/context-menu'
import { MoveDialog } from '../components/resources/move-dialog'
import { ViewToggle } from '../components/resources/view-toggle'
import { ResourceSearch } from '../components/resources/resource-search'
import { BulkActionBar } from '../components/resources/bulk-action-bar'
import { SortMenu } from '../components/items/sort-menu'
import { useItemDragDrop } from '../components/items/use-item-drag-drop'
import { NoteCard, NoteListHeader, NoteListItem, NoteTable } from '../components/notes/note-views'
import { NoteEditorDialog } from '../components/notes/note-editor-dialog'
import { FolderNameDialog } from '../components/notes/folder-name-dialog'
import {
  createNote,
  deleteNote,
  favoriteNote,
  fetchNote,
  fetchNotes,
  moveNote,
  searchNotes,
  updateNote,
} from '../services/notes-services'

// Notes has the Cards view's toggle slot but no preview images; keep the
// three views it supports.
const NOTE_VIEWS = ['grid', 'list', 'table']

export function NotesPage() {
  const api = useApi()
  const toast = useToast()
  const { activeWorkspace } = useWorkspace()
  const { currentFolder, openFolder, searchParams, setSearchParams } = useFolderParam(activeWorkspace?.id)

  const [items, setItems] = useState([])
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [view, setView] = useState(() => {
    const saved = localStorage.getItem('vault-notes-view')
    return NOTE_VIEWS.includes(saved) ? saved : 'grid'
  })
  const { sortBy, sortOrder, changeSort, toggleColumn } = usePersistentSort('vault-notes-sort')

  // Selection, cleared whenever the folder changes (including via Back).
  const [selectedIds, setSelectedIds] = useState([])
  const [selectionFolder, setSelectionFolder] = useState(currentFolder)
  if (selectionFolder !== currentFolder) {
    setSelectionFolder(currentFolder)
    setSelectedIds([])
  }

  // Dialogs. Folder dialogs remount per use (key) so they start fresh.
  const [folderDialog, setFolderDialog] = useState(null) // { mode: 'create' } | { mode: 'rename', item }
  const [folderDialogKey, setFolderDialogKey] = useState(0)
  const openFolderDialog = (dialog) => {
    setFolderDialogKey((k) => k + 1)
    setFolderDialog(dialog)
  }
  // Items being moved: one from its menu, or the current selection.
  const [moveIds, setMoveIds] = useState(null)

  // The open note: the note being edited, or a stub with isNew for a new one.
  // Its id is mirrored in the URL (?note=<id>) so refresh keeps it open and
  // Back closes it.
  const [editorTarget, setEditorTarget] = useState(null)
  const noteParam = searchParams.get('note')
  // Shown only while the URL names it (or it's new and unsaved), so Back,
  // which drops ?note, closes the editor without any state change.
  const showEditor = Boolean(editorTarget) && (editorTarget.isNew || editorTarget.id === noteParam)

  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu()

  // ─── Fetch items ───────────────────────────────────────────────
  // Only the latest request may update the list (fast folder clicks).
  const fetchIdRef = useRef(0)
  const fetchItems = useCallback(async () => {
    if (!activeWorkspace) return
    const fetchId = ++fetchIdRef.current
    setLoading(true)
    setLoadError(false)
    try {
      const data = await fetchNotes(api, {
        workspaceId: activeWorkspace.id,
        sortBy,
        sortOrder,
        parentId: currentFolder,
      })
      if (fetchId !== fetchIdRef.current) return
      setItems(data.items ?? [])
      setBreadcrumbs(data.breadcrumbs ?? [])
    } catch {
      // Shown as an error state; an empty list would wrongly read "No notes yet".
      if (fetchId === fetchIdRef.current) setLoadError(true)
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false)
    }
  }, [api, activeWorkspace, currentFolder, sortBy, sortOrder])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchItems()
    })
  }, [fetchItems])

  useEffect(() => {
    localStorage.setItem('vault-notes-view', view)
  }, [view])

  // ─── Open note <-> URL ─────────────────────────────────────────
  const setNoteParam = useCallback(
    (noteId, { replace = false } = {}) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (noteId) next.set('note', noteId)
          else next.delete('note')
          return next
        },
        { replace },
      ),
    [setSearchParams],
  )

  const openNote = (item, { edit = false } = {}) => {
    // Search results may come without the note body; then the URL effect
    // below loads the full note instead of opening an empty editor.
    if (item.content !== undefined) setEditorTarget({ ...item, startInEdit: edit })
    setNoteParam(item.id)
  }
  const openNewNote = () => setEditorTarget({ isNew: true, title: '', content: '' })
  const closeEditor = () => {
    setEditorTarget(null)
    if (noteParam) setNoteParam(null)
  }

  // A refreshed or shared ?note= link loads that note.
  useEffect(() => {
    if (!noteParam || editorTarget?.id === noteParam) return
    let cancelled = false
    fetchNote(api, noteParam)
      .then((note) => {
        if (!cancelled && note) setEditorTarget(note)
      })
      .catch(() => {
        if (cancelled) return
        toast.error("That note couldn't be opened. It may have been deleted.")
        setNoteParam(null, { replace: true })
      })
    return () => {
      cancelled = true
    }
    // editorTarget is read, not tracked: only URL changes should drive this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteParam, api])

  const handleSaveNote = useCallback(
    async ({ title, content }) => {
      if (editorTarget?.isNew) {
        const created = await createNote(api, {
          title,
          content,
          type: 'note',
          workspaceId: activeWorkspace.id,
          parentId: currentFolder,
        })
        // Adopt the new id so later autosaves update rather than insert.
        setEditorTarget({ ...created, isNew: false })
        setNoteParam(created.id, { replace: true })
        fetchItems()
        return created
      }

      const updated = await updateNote(api, editorTarget.id, { title, content })
      fetchItems()
      return updated
    },
    [api, activeWorkspace, currentFolder, editorTarget, fetchItems, setNoteParam],
  )

  // ─── Actions ───────────────────────────────────────────────────
  // One-click actions update the list at once, then confirm with the server;
  // failures show a toast and reload the true state.
  const attempt = async (action, failMessage) => {
    try {
      await action()
    } catch (error) {
      toast.error(error.status === 400 && error.message ? error.message : failMessage)
      fetchItems()
    }
  }

  const removeLocally = (ids) => setItems((prev) => prev.filter((item) => !ids.includes(item.id)))

  const handleOpen = (item) => {
    if (item.type === 'folder') openFolder(item.id)
    else openNote(item)
  }

  const handleCreateFolder = async (name) => {
    await createNote(api, {
      title: name,
      type: 'folder',
      workspaceId: activeWorkspace.id,
      parentId: currentFolder,
      description: '',
    })
    fetchItems()
  }

  const handleRenameFolder = async (item, name) => {
    const updated = await updateNote(api, item.id, { title: name })
    setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, ...updated } : entry)))
    fetchItems()
  }

  // Deleting moves notes to Trash; offer an immediate way back.
  const offerUndo = (ids) => {
    toast.show({
      message: ids.length === 1 ? 'Moved to Trash' : `${ids.length} items moved to Trash`,
      action: {
        label: 'Undo',
        onClick: () =>
          attempt(async () => {
            await Promise.all(ids.map((id) => api(`/notes/${id}/restore`, { method: 'POST' })))
            fetchItems()
          }, 'Could not restore. You can still restore from Trash.'),
      },
    })
  }

  const deleteItems = (ids) =>
    attempt(async () => {
      removeLocally(ids)
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))
      await Promise.all(ids.map((id) => deleteNote(api, id)))
      offerUndo(ids)
    }, 'Could not delete. Please try again.')

  const handleFavorite = (itemId) =>
    attempt(async () => {
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, isFavorite: !item.isFavorite } : item)),
      )
      await favoriteNote(api, itemId)
    }, 'Could not update favorite. Please try again.')

  // Notes have no bulk endpoint; moves go one by one.
  const moveItems = (ids, targetParentId) => Promise.all(ids.map((id) => moveNote(api, id, targetParentId)))

  // From the Move dialog, which shows any error inline.
  const handleMoveDialog = async (targetParentId) => {
    await moveItems(moveIds, targetParentId)
    if (String(targetParentId ?? '') !== String(currentFolder ?? '')) removeLocally(moveIds)
    setSelectedIds((prev) => prev.filter((id) => !moveIds.includes(id)))
    fetchItems()
  }

  // Drag and drop: applied at once, with Undo moving everything back.
  const moveByDrag = (ids, targetFolderId) =>
    attempt(async () => {
      const sourceFolderId = currentFolder
      if (String(targetFolderId ?? '') === String(sourceFolderId ?? '')) return
      removeLocally(ids)
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))
      await moveItems(ids, targetFolderId)
      const targetName = targetFolderId
        ? (items.find((item) => item.id === targetFolderId) ?? breadcrumbs.find((c) => c.id === targetFolderId))?.title ?? 'folder'
        : 'Notes'
      toast.show({
        message: `Moved ${ids.length === 1 ? '1 item' : `${ids.length} items`} to ${targetName}`,
        action: {
          label: 'Undo',
          onClick: () =>
            attempt(async () => {
              await moveItems(ids, sourceFolderId)
              fetchItems()
            }, 'Could not undo the move.'),
        },
      })
    }, 'Could not move. Please try again.')

  const dnd = useItemDragDrop({ selectedIds, onMove: moveByDrag })

  const handleSelect = (itemId) => {
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    )
  }

  const allSelected = items.length > 0 && selectedIds.length === items.length
  const someSelected = selectedIds.length > 0 && !allSelected
  const handleToggleAll = () => {
    setSelectedIds(allSelected ? [] : items.map((item) => item.id))
  }

  const gridFolders = items.filter((item) => item.type === 'folder')
  const gridNotes = items.filter((item) => item.type !== 'folder')

  const handleToggleGroup = (groupItems) => {
    const groupIds = groupItems.map((item) => item.id)
    const allChosen = groupIds.every((id) => selectedIds.includes(id))
    setSelectedIds((prev) =>
      allChosen
        ? prev.filter((id) => !groupIds.includes(id))
        : [...new Set([...prev, ...groupIds])],
    )
  }

  const anyDialogOpen = Boolean(folderDialog) || moveIds !== null
  useItemShortcuts({
    items,
    selectedIds,
    setSelectedIds,
    onDeleteSelected: () => deleteItems(selectedIds),
    disabled: anyDialogOpen || Boolean(contextMenu) || showEditor,
  })

  // Workspace-wide note search.
  const handleSearch = useCallback(
    async (query) => {
      if (!activeWorkspace) return []
      const data = await searchNotes(api, { workspaceId: activeWorkspace.id, query })
      return data.items ?? []
    },
    [api, activeWorkspace],
  )

  // ─── Context Menu Items ────────────────────────────────────────
  const getContextMenuItems = (item) => [
    {
      label: item.type === 'folder' ? 'Open Folder' : 'View Note',
      icon: item.type === 'folder' ? FolderInput : BookMarked,
      onClick: () => handleOpen(item),
    },
    {
      // The only way to start selecting on touch screens, which can't hover to
      // reveal the checkbox.
      label: selectedIds.includes(item.id) ? 'Deselect' : 'Select',
      icon: CheckSquare,
      onClick: () => handleSelect(item.id),
    },
    {
      // Folders are renamed; notes open straight into editing.
      label: item.type === 'folder' ? 'Rename' : 'Edit',
      icon: Pencil,
      onClick: () =>
        item.type === 'folder' ? openFolderDialog({ mode: 'rename', item }) : openNote(item, { edit: true }),
    },
    {
      label: item.isFavorite ? 'Remove Favorite' : 'Add Favorite',
      icon: Star,
      onClick: () => handleFavorite(item.id),
    },
    {
      label: 'Move to...',
      icon: FolderInput,
      onClick: () => setMoveIds([item.id]),
    },
    { separator: true },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: () => deleteItems([item.id]),
      danger: true,
    },
  ]

  // ─── Render ────────────────────────────────────────────────────
  // The editor takes over the content column; the sidebar stays visible
  // because this renders inside the shell's <main>, not as a fixed overlay.
  if (showEditor) {
    return (
      <NoteEditorDialog
        note={editorTarget}
        mode={editorTarget.isNew || editorTarget.startInEdit ? 'edit' : 'read'}
        onClose={closeEditor}
        onSave={handleSaveNote}
      />
    )
  }

  const sharedItemProps = {
    onOpen: handleOpen,
    onContextMenu: handleContextMenu,
    onFavorite: handleFavorite,
    dnd,
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
            <Breadcrumbs breadcrumbs={breadcrumbs} onNavigate={openFolder} dnd={dnd} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle activeView={view} onViewChange={setView} views={NOTE_VIEWS} />
            <SortMenu sortBy={sortBy} sortOrder={sortOrder} onChange={changeSort} />
            <Button size="sm" variant="outline" onClick={() => openFolderDialog({ mode: 'create' })}>
              <FolderPlus className="mr-1.5 h-4 w-4" />
              <span className="hidden xs:inline">Folder</span>
              <span className="xs:hidden">New</span>
            </Button>
            <Button size="sm" onClick={openNewNote}>
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="hidden xs:inline">Note</span>
              <span className="xs:hidden">Add</span>
            </Button>
          </div>
        </div>

        <ResourceSearch
          onSearch={handleSearch}
          onOpenResult={handleOpen}
          placeholder="Search in Notes"
        />
      </div>

      {/* Loading (first load only; refreshes keep the list on screen) */}
      {loading && items.length === 0 && !loadError && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Load failure */}
      {!loading && loadError && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold">Couldn't load your notes</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Check your connection and try again.</p>
          <Button className="mt-4" variant="outline" onClick={fetchItems}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !loadError && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-2xl bg-muted/50 p-6">
            <NotebookPen className="h-12 w-12 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-semibold">
            {currentFolder ? 'No notes in this folder' : 'No notes yet'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {currentFolder
              ? 'This folder is empty. Create a note or subfolder here.'
              : 'Create a folder to organize your notes, or start with a note.'}
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => openFolderDialog({ mode: 'create' })}>
              <FolderPlus className="mr-1.5 h-4 w-4" /> New Folder
            </Button>
            <Button onClick={openNewNote}>
              <Plus className="mr-1.5 h-4 w-4" /> New Note
            </Button>
          </div>
        </div>
      )}

      {/* Touch screens show selection checkboxes only once something is selected. */}
      <div className="group/sel" data-selecting={selectedIds.length > 0}>
        {/* Grid View */}
        {view === 'grid' && items.length > 0 && (
          <div className="space-y-6">
            {gridFolders.length > 0 && (
              <div>
                <NoteSectionHeader
                  label="Folders"
                  items={gridFolders}
                  selectedIds={selectedIds}
                  onToggleGroup={handleToggleGroup}
                  addLabel="New folder"
                  onAdd={() => openFolderDialog({ mode: 'create' })}
                />
                <div className="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(84px,1fr))]">
                  {gridFolders.map((item) => (
                    <NoteCard
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.includes(item.id)}
                      onSelect={handleSelect}
                      {...sharedItemProps}
                    />
                  ))}
                </div>
              </div>
            )}

            {gridNotes.length > 0 && (
              <div>
                <NoteSectionHeader
                  label="Notes"
                  items={gridNotes}
                  selectedIds={selectedIds}
                  onToggleGroup={handleToggleGroup}
                  addLabel="New note"
                  onAdd={openNewNote}
                />
                <div className="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(84px,1fr))]">
                  {gridNotes.map((item) => (
                    <NoteCard
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.includes(item.id)}
                      onSelect={handleSelect}
                      {...sharedItemProps}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {view === 'list' && items.length > 0 && (
          <div className="rounded-lg border border-border">
            <NoteListHeader
              onSort={toggleColumn}
              sortBy={sortBy}
              sortOrder={sortOrder}
              allSelected={allSelected}
              someSelected={someSelected}
              onToggleAll={handleToggleAll}
            />
            {items.map((item) => (
              <NoteListItem
                key={item.id}
                item={item}
                isSelected={selectedIds.includes(item.id)}
                onSelect={handleSelect}
                {...sharedItemProps}
              />
            ))}
          </div>
        )}

        {/* Table (detail) View */}
        {view === 'table' && items.length > 0 && (
          <div className="rounded-lg border border-border">
            <NoteTable
              items={items}
              selectedIds={selectedIds}
              onSelect={setSelectedIds}
              onSort={toggleColumn}
              sortBy={sortBy}
              sortOrder={sortOrder}
              {...sharedItemProps}
            />
          </div>
        )}
      </div>

      <BulkActionBar
        count={selectedIds.length}
        onDelete={() => deleteItems(selectedIds)}
        onMove={() => setMoveIds(selectedIds)}
        onClear={() => setSelectedIds([])}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          items={getContextMenuItems(contextMenu.data)}
          position={contextMenu}
          onClose={closeContextMenu}
        />
      )}

      {folderDialog && (
        <FolderNameDialog
          key={folderDialogKey}
          open
          title={folderDialog.mode === 'create' ? 'Create Folder' : 'Rename Folder'}
          submitLabel={folderDialog.mode === 'create' ? 'Create Folder' : 'Save'}
          initialName={folderDialog.item?.title ?? ''}
          onClose={() => setFolderDialog(null)}
          onSubmit={(name) =>
            folderDialog.mode === 'create' ? handleCreateFolder(name) : handleRenameFolder(folderDialog.item, name)
          }
        />
      )}

      <MoveDialog
        open={moveIds !== null}
        onClose={() => setMoveIds(null)}
        onSubmit={handleMoveDialog}
        api={api}
        workspaceId={activeWorkspace?.id}
        basePath="/notes"
      />
    </section>
  )
}

/**
 * Grid section heading: hover-revealed select-all for the group, a count, and
 * an add button for the matching type. Mirrors the Resources tab.
 */
function NoteSectionHeader({ label, items, selectedIds, onToggleGroup, addLabel, onAdd }) {
  const selectedCount = items.filter((item) => selectedIds.includes(item.id)).length
  const allSelected = items.length > 0 && selectedCount === items.length
  const someSelected = selectedCount > 0 && !allSelected

  return (
    <div className="group/section mb-2 flex items-center gap-2">
      <input
        type="checkbox"
        checked={allSelected}
        ref={(el) => {
          if (el) el.indeterminate = someSelected
        }}
        onChange={() => onToggleGroup(items)}
        aria-label={`Select all ${label.toLowerCase()}`}
        className={`h-3.5 w-3.5 cursor-pointer rounded border-border accent-primary transition-opacity focus-visible:opacity-100 group-hover/section:pointer-events-auto group-hover/section:opacity-100 ${
          selectedCount > 0 ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <h2 className="text-xs font-medium text-muted-foreground">
        {label}
        <span className="ml-1.5 text-muted-foreground/60">
          {selectedCount > 0 ? `${selectedCount} of ${items.length}` : items.length}
        </span>
      </h2>

      <button
        type="button"
        onClick={onAdd}
        title={addLabel}
        aria-label={addLabel}
        className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{addLabel}</span>
      </button>
    </div>
  )
}
