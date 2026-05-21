import { useCallback, useEffect, useState } from 'react'
import {
  FolderPlus, Plus, ArrowUpDown, RefreshCw,
  Pencil, Trash2, Star, FolderInput, ExternalLink, RotateCcw, Tag
} from 'lucide-react'
import { useApi } from '../hooks/use-api'
import { useWorkspace } from '../contexts/workspace-context'
import { Button } from '../components/ui/button'
import { Breadcrumbs } from '../components/resources/breadcrumbs'
import { ViewToggle } from '../components/resources/view-toggle'
import { ResourceCard, ResourceListItem, ResourceTable } from '../components/resources/resource-views'
import { CreateFolderDialog } from '../components/resources/create-folder-dialog'
import { AddResourceDialog } from '../components/resources/add-resource-dialog'
import { EditItemDialog } from '../components/resources/edit-item-dialog'
import { BulkActionBar } from '../components/resources/bulk-action-bar'
import { MoveDialog } from '../components/resources/move-dialog'
import { ContextMenu, useContextMenu } from '../components/ui/context-menu'

export function ResourcesPage() {
  const api = useApi()
  const { activeWorkspace } = useWorkspace()

  const [items, setItems] = useState([])
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [currentFolder, setCurrentFolder] = useState(null)
  const [view, setView] = useState(() => localStorage.getItem('vault-view') ?? 'grid')
  const [sortBy, setSortBy] = useState('position')
  const [sortOrder, setSortOrder] = useState('asc')
  const [loading, setLoading] = useState(false)

  // Dialogs
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showAddResource, setShowAddResource] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [showMoveDialog, setShowMoveDialog] = useState(false)

  // Selection
  const [selectedIds, setSelectedIds] = useState([])

  // Context menu
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu()

  // ─── Fetch items ───────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    if (!activeWorkspace) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        workspaceId: activeWorkspace.id,
        sortBy,
        sortOrder,
      })
      if (currentFolder) params.set('parentId', currentFolder)
      const data = await api(`/items?${params}`)
      setItems(data.items ?? [])
      setBreadcrumbs(data.breadcrumbs ?? [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [api, activeWorkspace, currentFolder, sortBy, sortOrder])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    localStorage.setItem('vault-view', view)
  }, [view])

  // ─── Actions ───────────────────────────────────────────────────
  const handleOpen = (item) => {
    if (item.type === 'folder') {
      setCurrentFolder(item.id)
      setSelectedIds([])
    } else if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleNavigate = (folderId) => {
    setCurrentFolder(folderId)
    setSelectedIds([])
  }

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

  const handleAddResource = async ({ title, url, description }) => {
    await api('/items', {
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
    // Refetch after a short delay to pick up metadata
    fetchItems()
    setTimeout(fetchItems, 3000)
  }

  const handleEditItem = async (itemId, updates) => {
    await api(`/items/${itemId}`, { method: 'PUT', body: updates })
    fetchItems()
  }

  const handleDelete = async (itemId) => {
    await api(`/items/${itemId}`, { method: 'DELETE' })
    fetchItems()
  }

  const handleFavorite = async (itemId) => {
    await api(`/items/${itemId}/favorite`, { method: 'POST' })
    fetchItems()
  }

  const handleRefreshMeta = async (itemId) => {
    await api(`/items/${itemId}/metadata`, { method: 'POST' })
    fetchItems()
  }

  const handleSelect = (itemId) => {
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    )
  }

  const handleBulkDelete = async () => {
    await api('/items/bulk', { method: 'POST', body: { action: 'delete', itemIds: selectedIds } })
    setSelectedIds([])
    fetchItems()
  }

  const handleBulkMove = async (targetParentId) => {
    await api('/items/bulk', {
      method: 'POST',
      body: { action: 'move', itemIds: selectedIds, targetParentId },
    })
    setSelectedIds([])
    fetchItems()
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
      label: item.type === 'folder' ? 'Open Folder' : 'Open Link',
      icon: item.type === 'folder' ? FolderInput : ExternalLink,
      onClick: () => handleOpen(item),
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
      label: 'Move to...',
      icon: FolderInput,
      onClick: () => {
        setSelectedIds([item.id])
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
  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
          <Breadcrumbs breadcrumbs={breadcrumbs} onNavigate={handleNavigate} />
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle activeView={view} onViewChange={setView} />
          <Button size="sm" variant="outline" onClick={() => setShowCreateFolder(true)}>
            <FolderPlus className="mr-1.5 h-4 w-4" /> Folder
          </Button>
          <Button size="sm" onClick={() => setShowAddResource(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Resource
          </Button>
        </div>
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
            {currentFolder ? (
              <FolderPlus className="h-12 w-12 text-muted-foreground/40" />
            ) : (
              <FolderPlus className="h-12 w-12 text-muted-foreground/40" />
            )}
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
            <Button onClick={() => setShowAddResource(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> {currentFolder ? 'Add Resource' : 'Add Resource'}
            </Button>
          </div>
        </div>
      )}

      {/* Grid View */}
      {view === 'grid' && items.length > 0 && (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(80px,1fr))]">
          {items.map((item) => (
            <div
              key={item.id}
              className="aspect-square"
            >
              <ResourceCard
                item={item}
                onOpen={handleOpen}
                onContextMenu={handleContextMenu}
                onFavorite={handleFavorite}
                isSelected={selectedIds.includes(item.id)}
                onSelect={handleSelect}
              />
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === 'list' && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <ResourceListItem
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

      {/* Table View */}
      {view === 'table' && items.length > 0 && (
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
        />
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        count={selectedIds.length}
        onDelete={handleBulkDelete}
        onMove={() => setShowMoveDialog(true)}
        onTag={() => {}} // Tag dialog would go here
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
        open={showAddResource}
        onClose={() => setShowAddResource(false)}
        onSubmit={handleAddResource}
      />
      <EditItemDialog
        open={Boolean(editItem)}
        onClose={() => setEditItem(null)}
        item={editItem}
        onSubmit={handleEditItem}
      />
      <MoveDialog
        open={showMoveDialog}
        onClose={() => {
          setShowMoveDialog(false)
        }}
        onSubmit={handleBulkMove}
        api={api}
        workspaceId={activeWorkspace?.id}
      />
    </section>
  )
}
