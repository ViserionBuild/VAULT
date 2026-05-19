import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FolderPlus, Plus, RefreshCw, Pencil, Trash2, Star,
  FolderInput, BookMarked, NotebookPen
} from 'lucide-react'
import DOMPurify from 'dompurify'
import { useApi } from '../hooks/use-api'
import { useWorkspace } from '../contexts/workspace-context'
import { Button } from '../components/ui/button'
import { Breadcrumbs } from '../components/resources/breadcrumbs'
import { ContextMenu, useContextMenu } from '../components/ui/context-menu'
import { Select } from '../components/ui/select'
import { MoveDialog } from '../components/resources/move-dialog'
import {
  createNote,
  deleteNote,
  favoriteNote,
  fetchNote,
  fetchNotes,
  moveNote,
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

  // Dialogs
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [folderTitle, setFolderTitle] = useState('')
  const [showCreateNote, setShowCreateNote] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [editItem, setEditItem] = useState(null)
  const iframeRef = useRef(null)
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

  useEffect(() => {
    const handleMessage = (e) => {
      const msg = e.data || {}
      if (msg.type === 'editor-ready') {
        const iframe = iframeRef.current
        if (iframe && iframe.contentWindow) {
          const payload = {
            type: 'init',
            title: showCreateNote ? noteTitle : (editItem?.title || ''),
            content: showCreateNote ? noteContent : (editItem?.content || ''),
          }
          iframe.contentWindow.postMessage(payload, '*')
        }
      }

      if (msg.type === 'save') {
        const content = msg.content ?? ''
        if (showCreateNote) {
          (async () => {
            if (!noteTitle.trim()) return
            await createNote(api, {
              title: noteTitle,
              type: 'note',
              content,
              workspaceId: activeWorkspace.id,
              parentId: currentFolder,
              description: '',
            })
            setNoteTitle('')
            setNoteContent('')
            setShowCreateNote(false)
            fetchItems()
          })()
        } else if (editItem) {
          (async () => {
            await handleEditItem(editItem.id, { title: editItem.title, content })
          })()
        }
      }

      if (msg.type === 'cancel') {
        if (showCreateNote) setShowCreateNote(false)
        if (editItem) setEditItem(null)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [showCreateNote, editItem, noteTitle, noteContent, api, activeWorkspace, currentFolder, fetchItems, handleEditItem])

  // Ensure iframe editor receives init payload when dialogs open (covers already-ready iframe)
  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'init',
        title: showCreateNote ? noteTitle : (editItem?.title || ''),
        content: showCreateNote ? noteContent : (editItem?.content || ''),
      }, '*')
    }
  }, [showCreateNote, editItem, noteTitle, noteContent])

  // ─── Actions ───────────────────────────────────────────────────
  const handleOpen = (item) => {
    if (item.type === 'folder') {
      setCurrentFolder(item.id)
      return
    }

    // open note viewer for notes
    if (item.type === 'note') {
      void (async () => {
        try {
          const data = await fetchNote(api, item.id)
          setViewItem(data?.item || item)
        } catch {
          setViewItem(item)
        }
      })()
    }
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

  // helper to strip HTML for list preview
  const stripHtml = (html) => {
    if (!html) return ''
    try {
      const div = document.createElement('div')
      div.innerHTML = html
      return div.textContent || div.innerText || ''
    } catch {
      return html
    }
  }

  const sanitizeNoteHtml = (html) => DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'a', 'p', 'br', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'rel', 'target', 'class'],
  })

  const [viewItem, setViewItem] = useState(null)


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
      onClick: () => setEditItem(item),
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
  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
          <Breadcrumbs breadcrumbs={breadcrumbs} onNavigate={handleNavigate} />
        </div>
        <div className="flex items-center gap-2">
          <Select
            className="w-36 h-9 text-xs"
            value={sortBy}
            onChange={(e) => handleSort(e.target.value)}
          >
            <option value="position">Manual</option>
            <option value="title">Name</option>
            <option value="createdAt">Created</option>
            <option value="updatedAt">Modified</option>
          </Select>
          <Button size="sm" variant="outline" onClick={() => setShowCreateFolder(true)}>
            <FolderPlus className="mr-1.5 h-4 w-4" /> Folder
          </Button>
          <Button size="sm" onClick={() => setShowCreateNote(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Note
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
            <Button onClick={() => setShowCreateNote(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New Note
            </Button>
          </div>
        </div>
      )}

      {/* Items List */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-4 rounded-lg border border-input bg-card hover:bg-muted/50"
              onContextMenu={(e) => handleContextMenu(e, item)}
            >
              <div
                className="flex-1 cursor-pointer min-w-0"
                onClick={() => item.type === 'folder' && handleOpen(item)}
              >
                <div className="flex items-center gap-2">
                  {item.type === 'folder' ? (
                    <FolderPlus className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  ) : (
                    <NotebookPen className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  )}
                  <h3 className="font-medium truncate">{item.title}</h3>
                </div>
                {item.type === 'note' && item.content && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{stripHtml(item.content)}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleFavorite(item.id)}
                  title={item.isFavorite ? 'Remove favorite' : 'Add favorite'}
                >
                  <Star
                    className="h-4 w-4"
                    fill={item.isFavorite ? 'currentColor' : 'none'}
                  />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMoveItem(item)
                    setShowMoveDialog(true)
                  }}
                  title="Move"
                >
                  <FolderInput className="h-4 w-4" />
                </Button>
                {editItem?.id === item.id ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        handleEditItem(item.id, {
                          title: editItem.title,
                          content: editItem.content,
                        })
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditItem(null)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditItem(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Item Dialog - Simple inline edit */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg border border-input p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Edit {editItem.type}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Title</label>
                <input
                  type="text"
                  value={editItem.title}
                  onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded border border-input bg-background text-sm"
                />
              </div>
              {editItem.type === 'note' && (
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <div className="w-full mt-1">
                    <iframe
                      ref={iframeRef}
                      title="Edit note editor"
                      src="/note-editor.html"
                      className="w-full h-56 border rounded"
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                <Button onClick={() => iframeRef.current?.contentWindow?.postMessage({ type: 'request-save' }, '*')}>Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Note Dialog */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg border border-input p-6 max-w-2xl w-full mx-4 overflow-auto">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold mb-2">{viewItem.title}</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
              </div>
            </div>
            <div className="prose max-w-none mt-4" dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(viewItem.content) }} />
          </div>
        </div>
      )}

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

      {/* Create Note Dialog */}
      {showCreateNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg border border-input p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Create Note</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Note title..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 rounded border border-input bg-background text-sm"
              />
              <div className="w-full">
                <iframe
                  ref={iframeRef}
                  title="Note editor"
                  src="/note-editor.html"
                  className="w-full h-56 border rounded"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreateNote(false)}>Cancel</Button>
                <Button onClick={() => iframeRef.current?.contentWindow?.postMessage({ type: 'request-save' }, '*')}>Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x ?? 0}
          y={contextMenu.y ?? 0}
          isOpen={contextMenu.isOpen ?? false}
          onClose={closeContextMenu}
          items={
            contextMenu.item
              ? getContextMenuItems(contextMenu.item)
              : []
          }
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
