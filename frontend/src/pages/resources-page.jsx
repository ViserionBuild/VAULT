import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FolderPlus, Plus, RefreshCw,
  Pencil, Trash2, Star, FolderInput, ExternalLink, CheckSquare, Tag
} from 'lucide-react'
import { useApi } from '../hooks/use-api'
import { useWorkspace } from '../contexts/workspace-context'
import { Button } from '../components/ui/button'
import { Breadcrumbs } from '../components/resources/breadcrumbs'
import { ViewToggle } from '../components/resources/view-toggle'
import { SortMenu } from '../components/items/sort-menu'
import { useFolderParam } from '../hooks/use-folder-param'
import { usePersistentSort } from '../hooks/use-persistent-sort'
import { useItemShortcuts } from '../hooks/use-item-shortcuts'
import { isItemDrag, useItemDragDrop } from '../components/items/use-item-drag-drop'
import { ResourceCard, ResourcePreviewCard, ResourceListItem, ResourceListHeader, ResourceTable } from '../components/resources/resource-views'
import { ResourceSearch } from '../components/resources/resource-search'
import { CreateFolderDialog } from '../components/resources/create-folder-dialog'
import { AddResourceDialog } from '../components/resources/add-resource-dialog'
import { AddMenu } from '../components/resources/add-menu'
import { EditItemDialog } from '../components/resources/edit-item-dialog'
import { BulkActionBar } from '../components/resources/bulk-action-bar'
import { MoveDialog } from '../components/resources/move-dialog'
import { ContextMenu, useContextMenu } from '../components/ui/context-menu'
import { useToast } from '../components/ui/toast'
import { TagPickerDialog } from '../components/tags/tag-picker-dialog'
import { canonicalUrl, parseWebUrl } from '../lib/url'

export function ResourcesPage() {
  const api = useApi()
  const toast = useToast()
  const { activeWorkspace } = useWorkspace()

  const [items, setItems] = useState([])
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const { currentFolder, openFolder, searchParams, setSearchParams } = useFolderParam(activeWorkspace?.id)
  const [view, setView] = useState(() => localStorage.getItem('vault-view') ?? 'grid')
  // Sort is remembered across visits, like the view.
  const { sortBy, sortOrder, changeSort, toggleColumn } = usePersistentSort('vault-resource-sort')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // Dialogs
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showAddResource, setShowAddResource] = useState(false)
  // Pre-filled URL for the add dialog; a new key remounts it to apply.
  const [addPrefill, setAddPrefill] = useState({ url: '', key: 0 })
  const openAddResource = (url = '') => {
    setAddPrefill((prev) => ({ url, key: prev.key + 1 }))
    setShowAddResource(true)
  }
  const [editItem, setEditItem] = useState(null)
  // Items being moved: one item from its menu, or the current selection.
  // Kept apart from the selection so cancelling a move leaves it untouched.
  const [moveIds, setMoveIds] = useState(null)
  // Items whose tags are being edited (one from its menu, or the selection).
  const [tagTargets, setTagTargets] = useState(null)

  // Selection, cleared whenever the folder changes (including via Back).
  const [selectedIds, setSelectedIds] = useState([])
  const [selectionFolder, setSelectionFolder] = useState(currentFolder)
  if (selectionFolder !== currentFolder) {
    setSelectionFolder(currentFolder)
    setSelectedIds([])
  }


  // Context menu
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu()

  // ─── Fetch items ───────────────────────────────────────────────
  // Only the latest request may update the list: clicking through folders
  // quickly must not let a slow earlier response show the wrong folder.
  const fetchIdRef = useRef(0)
  const fetchItems = useCallback(async () => {
    if (!activeWorkspace) return
    const fetchId = ++fetchIdRef.current
    setLoading(true)
    setLoadError(false)
    try {
      const params = new URLSearchParams({
        workspaceId: activeWorkspace.id,
        sortBy,
        sortOrder,
      })
      if (currentFolder) params.set('parentId', currentFolder)
      const data = await api(`/items?${params}`)
      if (fetchId !== fetchIdRef.current) return
      setItems(data.items ?? [])
      setBreadcrumbs(data.breadcrumbs ?? [])
    } catch {
      // Shown as an error state; an empty list would wrongly read "No items yet".
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
    localStorage.setItem('vault-view', view)
  }, [view])

  // ?new=folder|link (from the dashboard's quick actions) opens that dialog,
  // then drops the parameter so Back or refresh don't reopen it.
  const newIntent = searchParams.get('new')
  useEffect(() => {
    if (!newIntent) return
    queueMicrotask(() => {
      if (newIntent === 'folder') setShowCreateFolder(true)
      else if (newIntent === 'link') openAddResource()
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('new')
          return next
        },
        { replace: true },
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newIntent])

  // Paste a link anywhere on the page (outside a text field) to add it.
  const anyDialogOpen =
    showAddResource || showCreateFolder || Boolean(editItem) || moveIds !== null || tagTargets !== null
  useEffect(() => {
    const onPaste = (event) => {
      if (anyDialogOpen) return
      const target = event.target
      if (target.closest?.('input, textarea, [contenteditable="true"]')) return
      const text = event.clipboardData?.getData('text') ?? ''
      if (!parseWebUrl(text)) return
      event.preventDefault()
      openAddResource(text.trim())
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [anyDialogOpen])

  // "Paste link" in the add menu. Phones can't paste onto the page itself.
  const handlePasteLink = async () => {
    let text = ''
    try {
      text = (await navigator.clipboard.readText()).trim()
    } catch {
      // Permission refused; fall through to an empty dialog.
    }
    if (text && !parseWebUrl(text)) toast.show({ message: 'No link on the clipboard. Enter one instead.' })
    openAddResource(parseWebUrl(text) ? text : '')
  }

  // An already-saved item with the same link, for the add dialog's warning.
  const findExisting = useCallback(
    async (url) => {
      const canonical = canonicalUrl(url)
      if (!canonical || !activeWorkspace) return null
      const host = parseWebUrl(url).hostname.replace(/^www\./, '')
      const params = new URLSearchParams({ q: host, workspaceId: activeWorkspace.id })
      const data = await api(`/items/search?${params}`)
      return (data.items ?? []).find((item) => item.type === 'url' && canonicalUrl(item.url) === canonical) ?? null
    },
    [api, activeWorkspace],
  )

  // ─── Actions ───────────────────────────────────────────────────
  // One-click actions update the list immediately, then confirm with the
  // server. On failure they report it in a toast and reload the true state.
  // (Dialog actions throw instead, so the dialog can show the error inline.)
  const attempt = async (action, failMessage) => {
    try {
      await action()
    } catch (error) {
      toast.error(error.status === 400 && error.message ? error.message : failMessage)
      fetchItems()
    }
  }

  const removeLocally = (itemIds) =>
    setItems((prev) => prev.filter((item) => !itemIds.includes(item.id)))

  const handleOpen = (item) => {
    if (item.type === 'folder') {
      openFolder(item.id)
    } else if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleNavigate = openFolder

  const handleCreateFolder = async ({ title, icon, color }) => {
    await api('/items', {
      method: 'POST',
      body: {
        title,
        type: 'folder',
        icon,
        color,
        workspaceId: activeWorkspace.id,
        parentId: currentFolder,
        description: '',
      },
    })
    fetchItems()
  }

  // Stops metadata polling once the page is gone.
  const mountedRef = useRef(true)
  useEffect(() => {
    // Reset on mount too: StrictMode mounts, unmounts and remounts in dev.
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // The server fetches a new link's title and favicon in the background, which
  // can take up to ~8s. Poll the item until that lands, then refresh once.
  const refreshWhenMetadataArrives = async (itemId) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      if (!mountedRef.current) return
      try {
        const item = await api(`/items/${itemId}`)
        if (item?.metadata?.fetchedAt) break
      } catch {
        return
      }
    }
    if (mountedRef.current) fetchItems()
  }

  const handleAddResource = async ({ title, url, description }) => {
    const created = await api('/items', {
      method: 'POST',
      body: {
        title,
        type: 'url',
        url,
        description,
        workspaceId: activeWorkspace.id,
        parentId: currentFolder,
      },
    })
    fetchItems()
    if (created?.id) void refreshWhenMetadataArrives(created.id)
  }

  const handleEditItem = async (itemId, updates) => {
    const updated = await api(`/items/${itemId}`, { method: 'PUT', body: updates })
    // Show the saved values at once; the refetch keeps sort order right.
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...updated } : item)))
    fetchItems()
  }

  // Deleting moves items to Trash; offer an immediate way back.
  const offerUndo = (itemIds) => {
    toast.show({
      message: itemIds.length === 1 ? 'Moved to Trash' : `${itemIds.length} items moved to Trash`,
      action: {
        label: 'Undo',
        onClick: () =>
          attempt(async () => {
            await Promise.all(itemIds.map((id) => api(`/items/${id}/restore`, { method: 'POST' })))
            fetchItems()
          }, 'Could not restore. You can still restore from Trash.'),
      },
    })
  }

  const handleDelete = (itemId) =>
    attempt(async () => {
      removeLocally([itemId])
      await api(`/items/${itemId}`, { method: 'DELETE' })
      offerUndo([itemId])
    }, 'Could not delete. Please try again.')

  const handleFavorite = (itemId) =>
    attempt(async () => {
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, isFavorite: !item.isFavorite } : item)),
      )
      await api(`/items/${itemId}/favorite`, { method: 'POST' })
    }, 'Could not update favorite. Please try again.')

  const handleRefreshMeta = (itemId) =>
    attempt(async () => {
      await api(`/items/${itemId}/metadata`, { method: 'POST' })
      fetchItems()
      toast.success('Link details refreshed')
    }, 'Could not refresh link details. Please try again.')

  // Drag-and-drop move. Applied at once, with Undo moving everything back.
  const moveByDrag = (itemIds, targetFolderId) =>
    attempt(async () => {
      const sourceFolderId = currentFolder
      if (String(targetFolderId ?? '') === String(sourceFolderId ?? '')) return
      removeLocally(itemIds)
      setSelectedIds((prev) => prev.filter((id) => !itemIds.includes(id)))
      await api('/items/bulk', {
        method: 'POST',
        body: { action: 'move', itemIds, targetParentId: targetFolderId },
      })
      const targetName = targetFolderId
        ? (items.find((item) => item.id === targetFolderId) ?? breadcrumbs.find((c) => c.id === targetFolderId))?.title ?? 'folder'
        : 'Resources'
      toast.show({
        message: `Moved ${itemIds.length === 1 ? '1 item' : `${itemIds.length} items`} to ${targetName}`,
        action: {
          label: 'Undo',
          onClick: () =>
            attempt(async () => {
              await api('/items/bulk', {
                method: 'POST',
                body: { action: 'move', itemIds, targetParentId: sourceFolderId },
              })
              fetchItems()
            }, 'Could not undo the move.'),
        },
      })
    }, 'Could not move. Please try again.')

  const dnd = useItemDragDrop({ selectedIds, onMove: moveByDrag })

  // A link dragged in from another tab or app opens the add dialog with it.
  const dropLinkProps = {
    onDragOver: (event) => {
      if (isItemDrag(event) || !event.dataTransfer.types.includes('text/uri-list')) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    },
    onDrop: (event) => {
      if (isItemDrag(event)) return
      const link = event.dataTransfer
        .getData('text/uri-list')
        .split(/\r?\n/)
        .find((line) => line && !line.startsWith('#'))
      if (!link || !parseWebUrl(link)) return
      event.preventDefault()
      openAddResource(link)
    },
  }

  const handleSelect = (itemId) => {
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    )
  }

  const handleBulkDelete = () =>
    attempt(async () => {
      const deletedIds = selectedIds
      removeLocally(deletedIds)
      setSelectedIds([])
      await api('/items/bulk', { method: 'POST', body: { action: 'delete', itemIds: deletedIds } })
      offerUndo(deletedIds)
    }, 'Could not delete the selected items. Please try again.')

  useItemShortcuts({
    items,
    selectedIds,
    setSelectedIds,
    onDeleteSelected: handleBulkDelete,
    disabled: anyDialogOpen || Boolean(contextMenu),
  })

  const handleMove = async (targetParentId) => {
    await api('/items/bulk', {
      method: 'POST',
      body: { action: 'move', itemIds: moveIds, targetParentId },
    })
    // Moved items have left this folder, so they can't stay selected.
    if (String(targetParentId ?? '') !== String(currentFolder ?? '')) removeLocally(moveIds)
    setSelectedIds((prev) => prev.filter((id) => !moveIds.includes(id)))
    fetchItems()
  }

  // Workspace-wide search. useCallback because ResourceSearch depends on it in
  // an effect; a new identity each render would retrigger the search.
  const handleSearch = useCallback(
    async (query) => {
      if (!activeWorkspace) return []
      const params = new URLSearchParams({ q: query, workspaceId: activeWorkspace.id })
      const data = await api(`/items/search?${params}`)
      return data.items ?? []
    },
    [api, activeWorkspace],
  )

  // Opening a folder hit navigates into it; a link hit opens as usual.
  const handleOpenSearchResult = (item) => {
    if (item.type === 'folder') {
      openFolder(item.id)
      return
    }
    handleOpen(item)
  }

  // Select-all state, shared by the list header and the table header.
  const allSelected = items.length > 0 && selectedIds.length === items.length
  const someSelected = selectedIds.length > 0 && !allSelected
  const handleToggleAll = () => {
    setSelectedIds(allSelected ? [] : items.map((item) => item.id))
  }

  // Grid view groups folders above files, preserving the active sort order.
  const gridFolders = items.filter((item) => item.type === 'folder')
  const gridFiles = items.filter((item) => item.type !== 'folder')

  // Toggles one grid section without disturbing selections in the other.
  const handleToggleGroup = (groupItems) => {
    const groupIds = groupItems.map((item) => item.id)
    const allChosen = groupIds.every((id) => selectedIds.includes(id))
    setSelectedIds((prev) =>
      allChosen
        ? prev.filter((id) => !groupIds.includes(id))
        : [...new Set([...prev, ...groupIds])],
    )
  }

  const handleSort = toggleColumn

  // ─── Context Menu Items ────────────────────────────────────────
  const getContextMenuItems = (item) => [
    {
      label: item.type === 'folder' ? 'Open Folder' : 'Open Link',
      icon: item.type === 'folder' ? FolderInput : ExternalLink,
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
      label: 'Edit',
      icon: Pencil,
      onClick: () => setEditItem(item),
    },
    {
      label: item.isFavorite ? 'Remove Favorite' : 'Add Favorite',
      icon: Star,
      onClick: () => handleFavorite(item.id),
    },
    ...(item.type === 'url'
      ? [
          {
            label: 'Refresh Metadata',
            icon: RefreshCw,
            onClick: () => handleRefreshMeta(item.id),
          },
        ]
      : []),
    {
      label: 'Tags...',
      icon: Tag,
      onClick: () => setTagTargets([item]),
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
      onClick: () => handleDelete(item.id),
      danger: true,
    },
  ]

  // ─── Render ────────────────────────────────────────────────────
  return (
    <section className="space-y-4" {...dropLinkProps}>
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
            <Breadcrumbs breadcrumbs={breadcrumbs} onNavigate={handleNavigate} dnd={dnd} />
          </div>

          {/* Actions wrap rather than overflow on narrow screens */}
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle activeView={view} onViewChange={setView} />
            <SortMenu sortBy={sortBy} sortOrder={sortOrder} onChange={changeSort} />
            <AddMenu
              onNewFolder={() => setShowCreateFolder(true)}
              onAddLink={() => openAddResource()}
              onPasteLink={handlePasteLink}
              locationName={breadcrumbs.at(-1)?.title ?? activeWorkspace?.name ?? 'Resources'}
              disabled={anyDialogOpen}
              hideFab={selectedIds.length > 0}
            />
          </div>
        </div>

        {/* Spans the full content width, like Drive's search bar */}
        <ResourceSearch onSearch={handleSearch} onOpenResult={handleOpenSearchResult} />
      </div>

      {/* Loading */}
      {loading && items.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Load failure */}
      {!loading && loadError && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold">Couldn't load your resources</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Check your connection and try again.
          </p>
          <Button className="mt-4" variant="outline" onClick={fetchItems}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !loadError && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-2xl bg-muted/50 p-6">
            <FolderPlus className="h-12 w-12 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-semibold">
            {currentFolder ? 'No files exist' : 'No items yet'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {currentFolder
              ? 'This folder is empty. Add a folder or URL resource here to start organizing it.'
              : 'Create a folder to organize your resources, or add a URL resource to get started.'}
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setShowCreateFolder(true)}>
              <FolderPlus className="mr-1.5 h-4 w-4" /> New Folder
            </Button>
            <Button onClick={() => openAddResource()}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Resource
            </Button>
          </div>
        </div>
      )}

      {/* Touch screens show selection checkboxes only once something is selected. */}
      <div className="group/sel" data-selecting={selectedIds.length > 0}>
      {/* Grid and Cards views - folders and files in separate sections, like
          Drive. Cards differ only in showing files as preview cards. */}
      {(view === 'grid' || view === 'cards') && items.length > 0 && (
        <div className="space-y-6">
          {gridFolders.length > 0 && (
            <div>
              <GridSectionHeader
                label="Folders"
                items={gridFolders}
                selectedIds={selectedIds}
                onToggleGroup={handleToggleGroup}
                addLabel="New folder"
                onAdd={() => setShowCreateFolder(true)}
              />
              <div className="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(84px,1fr))]">
                {gridFolders.map((item) => (
                  <ResourceCard
                    key={item.id}
                    item={item}
                    onOpen={handleOpen}
                    onContextMenu={handleContextMenu}
                    onFavorite={handleFavorite}
                    isSelected={selectedIds.includes(item.id)}
                    onSelect={handleSelect}
                    dnd={dnd}
                  />
                ))}
              </div>
            </div>
          )}

          {gridFiles.length > 0 && (
            <div>
              <GridSectionHeader
                label="Files"
                items={gridFiles}
                selectedIds={selectedIds}
                onToggleGroup={handleToggleGroup}
                addLabel="Add resource"
                onAdd={() => openAddResource()}
              />
              <div
                className={
                  view === 'cards'
                    ? 'grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr))]'
                    : 'grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(84px,1fr))]'
                }
              >
                {gridFiles.map((item) => {
                  const FileView = view === 'cards' ? ResourcePreviewCard : ResourceCard
                  return (
                  <FileView
                    key={item.id}
                    item={item}
                    onOpen={handleOpen}
                    onContextMenu={handleContextMenu}
                    onFavorite={handleFavorite}
                    isSelected={selectedIds.includes(item.id)}
                    onSelect={handleSelect}
                    dnd={dnd}
                  />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {view === 'list' && items.length > 0 && (
        <div className="rounded-lg border border-border">
          <ResourceListHeader
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
            allSelected={allSelected}
            someSelected={someSelected}
            onToggleAll={handleToggleAll}
          />
          {items.map((item) => (
            <ResourceListItem
              key={item.id}
              item={item}
              onOpen={handleOpen}
              onContextMenu={handleContextMenu}
              onFavorite={handleFavorite}
              isSelected={selectedIds.includes(item.id)}
              onSelect={handleSelect}
              dnd={dnd}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && items.length > 0 && (
        <div className="rounded-lg border border-border">
        <ResourceTable
          items={items}
          onOpen={handleOpen}
          onContextMenu={handleContextMenu}
          onFavorite={handleFavorite}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          onSort={handleSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
          dnd={dnd}
        />
        </div>
      )}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        count={selectedIds.length}
        onDelete={handleBulkDelete}
        onMove={() => setMoveIds(selectedIds)}
        onTag={() => setTagTargets(items.filter((item) => selectedIds.includes(item.id)))}
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

      {/* Dialogs */}
      <CreateFolderDialog
        open={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onSubmit={handleCreateFolder}
      />
      <AddResourceDialog
        key={addPrefill.key}
        open={showAddResource}
        initialUrl={addPrefill.url}
        onClose={() => setShowAddResource(false)}
        onSubmit={handleAddResource}
        findExisting={findExisting}
        onShowExisting={(item) => {
          setShowAddResource(false)
          openFolder(item.parentId ?? null)
        }}
      />
      {editItem && (
        <EditItemDialog
          key={editItem.id}
          open
          onClose={() => setEditItem(null)}
          item={editItem}
          onSubmit={handleEditItem}
        />
      )}
      {tagTargets && (
        <TagPickerDialog
          open
          items={tagTargets}
          onClose={() => setTagTargets(null)}
          onChange={(tagsByItem) =>
            setItems((prev) =>
              prev.map((item) => (tagsByItem.has(item.id) ? { ...item, tags: tagsByItem.get(item.id) } : item)),
            )
          }
        />
      )}
      <MoveDialog
        open={moveIds !== null}
        onClose={() => setMoveIds(null)}
        onSubmit={handleMove}
        api={api}
        workspaceId={activeWorkspace?.id}
      />
    </section>
  )
}

/**
 * Section heading for the grid view: a select-all checkbox scoped to this
 * group, the label with a count, and an add button for the matching type.
 */
function GridSectionHeader({ label, items, selectedIds, onToggleGroup, addLabel, onAdd }) {
  const selectedCount = items.filter((item) => selectedIds.includes(item.id)).length
  const allSelected = items.length > 0 && selectedCount === items.length
  const someSelected = selectedCount > 0 && !allSelected

  return (
    <div className="group/section mb-2 flex items-center gap-2">
      <input
        type="checkbox"
        checked={allSelected}
        ref={(el) => {
          // indeterminate is a property, not an attribute.
          if (el) el.indeterminate = someSelected
        }}
        onChange={() => onToggleGroup(items)}
        aria-label={`Select all ${label.toLowerCase()}`}
        className={`h-3.5 w-3.5 cursor-pointer rounded border-border accent-primary transition-opacity focus-visible:opacity-100 group-hover/section:pointer-events-auto group-hover/section:opacity-100 ${
          // Stay visible while anything in the group is selected, so the
          // control that produced the selection does not vanish. Hidden state
          // also ignores clicks, so invisible space is not a hit target.
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
