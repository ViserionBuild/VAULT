import { useCallback, useEffect, useState } from 'react'
import {
  FolderPlus, Plus, RefreshCw, Pencil, Trash2, Star,
  FolderInput, BookMarked, NotebookPen
} from 'lucide-react'
import { useApi } from '../hooks/use-api'
import { useWorkspace } from '../contexts/workspace-context'
import { Button } from '../components/ui/button'
import { Breadcrumbs } from '../components/resources/breadcrumbs'
import { ContextMenu, useContextMenu } from '../components/ui/context-menu'
import { MoveDialog } from '../components/resources/move-dialog'
import { ViewToggle } from '../components/resources/view-toggle'
import { ResourceSearch } from '../components/resources/resource-search'
import { NoteCard, NoteListHeader, NoteListItem, NoteTable } from '../components/notes/note-views'
import { NoteEditorDialog } from '../components/notes/note-editor-dialog'
import {
  createNote,
  deleteNote,
  favoriteNote,
  fetchNotes,
  moveNote,
  searchNotes,
  updateNote,
} from '../services/notes-services'

export function NotesPage() {
  const api = useApi()
  const { activeWorkspace } = useWorkspace()

  const [items, setItems] = useState([])
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [currentFolder, setCurrentFolder] = useState(null)
  const [sortBy, setSortBy] = useState('position')
  const [sortOrder, setSortOrder] = useState('asc')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState(() => localStorage.getItem('vault-notes-view') ?? 'grid')
  const [selectedIds, setSelectedIds] = useState([])

  // Dialogs
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [folderTitle, setFolderTitle] = useState('')
  // One piece of state drives the note editor: the note being edited, or a
  // stub with isNew for a brand-new note.
  const [editorTarget, setEditorTarget] = useState(null)
  const [editItem, setEditItem] = useState(null)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [moveItem, setMoveItem] = useState(null)

  // Context menu
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu()

  // ─── Fetch items ───────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    if (!activeWorkspace) return
    setLoading(true)
    try {
      const data = await fetchNotes(api, {
        workspaceId: activeWorkspace.id,
        sortBy,
        sortOrder,
        parentId: currentFolder,
      })
      setItems(data.items ?? [])
      setBreadcrumbs(data.breadcrumbs ?? [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [api, activeWorkspace, currentFolder, sortBy, sortOrder])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchItems()
    })
  }, [fetchItems])

  const handleEditItem = useCallback(async (itemId, updates) => {
    await updateNote(api, itemId, updates)
    setEditItem(null)
    fetchItems()
  }, [api, fetchItems])

  // Note editing is in-React now; the iframe/postMessage bridge is gone.
  // Autosave writes through these, so there is no explicit save step.
  const openNewNote = () => setEditorTarget({ isNew: true, title: '', content: '' })

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
        // Adopt the new id so subsequent autosaves update rather than insert.
        setEditorTarget({ ...created, isNew: false })
        fetchItems()
        return created
      }

      const updated = await updateNote(api, editorTarget.id, { title, content })
      fetchItems()
      return updated
    },
    [api, activeWorkspace, currentFolder, editorTarget, fetchItems],
  )


  // ─── Actions ───────────────────────────────────────────────────
  const handleOpen = (item) => {
    if (item.type === 'folder') {
      setCurrentFolder(item.id)
      setSelectedIds([])
      return
    }
    // Notes open in the editor, which starts in reading mode.
    setEditorTarget(item)
  }

  const handleNavigate = (folderId) => {
    setCurrentFolder(folderId)
  }

  const handleCreateFolder = async () => {
    if (!folderTitle.trim()) return
    await createNote(api, {
      title: folderTitle,
      type: 'folder',
      workspaceId: activeWorkspace.id,
      parentId: currentFolder,
      description: '',
    })
    setFolderTitle('')
    setShowCreateFolder(false)
    fetchItems()
  }





  const handleDelete = async (itemId) => {
    await deleteNote(api, itemId)
    fetchItems()
  }

  const handleFavorite = async (itemId) => {
    await favoriteNote(api, itemId)
    fetchItems()
  }

  const handleMove = async (targetParentId) => {
    if (!moveItem) return
    await moveNote(api, moveItem.id, targetParentId)
    setMoveItem(null)
    setShowMoveDialog(false)
    fetchItems()
  }

  // Persist the chosen view, matching the Resources tab.
  useEffect(() => {
    localStorage.setItem('vault-notes-view', view)
  }, [view])

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

  // Workspace-wide note search.
  const handleSearch = useCallback(
    async (query) => {
      if (!activeWorkspace) return []
      const data = await searchNotes(api, { workspaceId: activeWorkspace.id, query })
      return data.items ?? []
    },
    [api, activeWorkspace],
  )

  const handleOpenSearchResult = (item) => {
    if (item.type === 'folder') {
      setCurrentFolder(item.id)
      return
    }
    handleOpen(item)
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  // ─── Context Menu Items ────────────────────────────────────────
  const getContextMenuItems = (item) => [
    {
      label: item.type === 'folder' ? 'Open Folder' : 'View Note',
      icon: item.type === 'folder' ? FolderInput : BookMarked,
      onClick: () => handleOpen(item),
    },
    {
      label: 'Edit',
      icon: Pencil,
      onClick: () => setEditorTarget(item),
    },
    {
      label: item.isFavorite ? 'Remove Favorite' : 'Add Favorite',
      icon: Star,
      onClick: () => handleFavorite(item.id),
    },
    {
      label: 'Move to...',
      icon: FolderInput,
      onClick: () => {
        setMoveItem(item)
        setShowMoveDialog(true)
      },
    },
    { separator: true },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: () => handleDelete(item.id),
      danger: true,
    },
  ]

  // ─── Render ────────────────────────────────────────────────────
  // The editor takes over the content column; the sidebar stays visible
  // because this renders inside the shell's <main>, not as a fixed overlay.
  if (editorTarget) {
    return (
      <NoteEditorDialog
        note={editorTarget}
        mode={editorTarget.isNew ? 'edit' : 'read'}
        onClose={() => setEditorTarget(null)}
        onSave={handleSaveNote}
      />
    )
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
            <Breadcrumbs breadcrumbs={breadcrumbs} onNavigate={handleNavigate} />
          </div>

          {/* The sort dropdown is gone: list and table headers sort by column,
              matching the Resources tab. */}
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle activeView={view} onViewChange={setView} />
            <Button size="sm" variant="outline" onClick={() => setShowCreateFolder(true)}>
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
          onOpenResult={handleOpenSearchResult}
          placeholder="Search in Notes"
        />
      </div>

      {/* Loading */}
      {loading && items.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
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
            <Button variant="outline" onClick={() => setShowCreateFolder(true)}>
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
      {!loading && view === 'grid' && items.length > 0 && (
        <div className="space-y-6">
          {gridFolders.length > 0 && (
            <div>
              <NoteSectionHeader
                label="Folders"
                items={gridFolders}
                selectedIds={selectedIds}
                onToggleGroup={handleToggleGroup}
                addLabel="New folder"
                onAdd={() => setShowCreateFolder(true)}
              />
              <div className="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(84px,1fr))]">
                {gridFolders.map((item) => (
                  <NoteCard
                    key={item.id}
                    item={item}
                    onOpen={handleOpen}
                    onContextMenu={handleContextMenu}
                    onFavorite={handleFavorite}
                    isSelected={selectedIds.includes(item.id)}
                    onSelect={handleSelect}
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
                    onOpen={handleOpen}
                    onContextMenu={handleContextMenu}
                    onFavorite={handleFavorite}
                    isSelected={selectedIds.includes(item.id)}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {!loading && view === 'list' && items.length > 0 && (
        <div className="rounded-lg border border-border">
          <NoteListHeader
            onSort={handleSort}
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
              onOpen={handleOpen}
              onContextMenu={handleContextMenu}
              onFavorite={handleFavorite}
              isSelected={selectedIds.includes(item.id)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Table (detail) View */}
      {!loading && view === 'table' && items.length > 0 && (
        <div className="rounded-lg border border-border">
          <NoteTable
            items={items}
            onOpen={handleOpen}
            onContextMenu={handleContextMenu}
            onFavorite={handleFavorite}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </div>
      )}
      </div>

      {/* Folder rename only - notes are edited in NoteEditorDialog */}
      {editItem && editItem.type === 'folder' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-5">
            <h2 className="mb-4 text-lg font-semibold">Rename folder</h2>
            <input
              type="text"
              value={editItem.title}
              onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button
                onClick={async () => {
                  await handleEditItem(editItem.id, { title: editItem.title })
                  setEditItem(null)
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Note Dialog */}

      {/* Create Folder Dialog */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg border border-input p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Create Folder</h2>
            <input
              type="text"
              placeholder="Folder name..."
              value={folderTitle}
              onChange={(e) => setFolderTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
              className="w-full px-3 py-2 rounded border border-input bg-background text-sm mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateFolder(false)}>Cancel</Button>
              <Button onClick={handleCreateFolder}>Create</Button>
            </div>
          </div>
        </div>
      )}


      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          items={getContextMenuItems(contextMenu.data)}
          position={contextMenu}
          onClose={closeContextMenu}
        />
      )}

      {showMoveDialog && (
        <MoveDialog
          key={moveItem?.id ?? 'notes-move'}
          open={showMoveDialog}
          onClose={() => {
            setShowMoveDialog(false)
            setMoveItem(null)
          }}
          onSubmit={handleMove}
          api={api}
          workspaceId={activeWorkspace?.id}
          basePath="/notes"
        />
      )}
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
