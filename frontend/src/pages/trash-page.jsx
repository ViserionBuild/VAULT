import { useCallback, useEffect, useState } from 'react'
import { Trash2, RotateCcw, RefreshCw, Globe, NotebookPen, ListTodo, CircleCheck } from 'lucide-react'
import { useApi } from '../hooks/use-api'
import { useWorkspace } from '../contexts/workspace-context'
import { Button } from '../components/ui/button'
import { Dialog } from '../components/ui/dialog'
import { useToast } from '../components/ui/toast'
import { FolderGlyph } from '../components/resources/folder-appearance'

// Each kind of deletable thing: its label and where to restore / purge it.
// `parent` names the trashed item it sits inside, if any.
const KINDS = {
  resource: {
    label: (item) => (item.type === 'folder' ? 'Folder' : 'Link'),
    path: (item) => `/items/${item.id}`,
    parent: (item) => item.parentId && `resource:${item.parentId}`,
  },
  note: {
    label: (item) => (item.type === 'folder' ? 'Notes folder' : 'Note'),
    path: (item) => `/notes/${item.id}`,
    parent: (item) => item.parentId && `note:${item.parentId}`,
  },
  todoList: {
    label: (item) => `TODO list · ${item.taskCount} task${item.taskCount === 1 ? '' : 's'}`,
    path: (item) => `/todo/lists/${item.id}`,
    parent: () => null,
  },
  todoTask: {
    label: (item) => (item.listTitle ? `Task in “${item.listTitle}”` : 'Task'),
    path: (item) => `/todo/tasks/${item.id}`,
    parent: (item) => `todoList:${item.listId}`,
  },
}
const keyOf = (e) => `${e.kind}:${e.item.id}`
const parentOf = (e) => KINDS[e.kind].parent(e.item) || null

function formatDeleted(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function TrashPage() {
  const api = useApi()
  const toast = useToast()
  const { workspaces, activeWorkspace } = useWorkspace()
  const [entries, setEntries] = useState([]) // { kind, item }
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [confirm, setConfirm] = useState(null) // { entry } | { all: true }
  const [emptying, setEmptying] = useState(false)

  const fetchTrash = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [resources, notes, todos] = await Promise.all([
        api('/items/trash'),
        api('/notes/trash'),
        // Optional, so a TODO hiccup doesn't hide the rest of the Trash.
        api('/todo/trash').catch(() => null),
      ])
      setEntries([
        ...(resources ?? []).map((item) => ({ kind: 'resource', item })),
        ...(notes ?? []).map((item) => ({ kind: 'note', item })),
        ...(todos?.lists ?? []).map((item) => ({ kind: 'todoList', item, isFolder: true })),
        ...(todos?.tasks ?? []).map((item) => ({ kind: 'todoTask', item })),
      ])
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchTrash()
    })
  }, [fetchTrash])

  // Deleting a folder trashes everything inside it too. Show only the
  // outermost deleted items; restoring a folder brings its contents back.
  const trashedKeys = new Set(entries.map(keyOf))
  const isNested = (e) => trashedKeys.has(parentOf(e))
  const insideCount = (folder) => {
    let count = 0
    const walk = (key) => {
      for (const e of entries) {
        if (parentOf(e) === key) {
          count += 1
          walk(keyOf(e))
        }
      }
    }
    walk(keyOf(folder))
    return count
  }
  const visible = entries
    .filter((e) => !isNested(e))
    .sort((a, b) => String(b.item.deletedAt).localeCompare(String(a.item.deletedAt)))

  // Drop an item and everything under it from the list.
  const removeTree = (root) => {
    const gone = new Set([keyOf(root)])
    let grew = true
    while (grew) {
      grew = false
      for (const e of entries) {
        if (!gone.has(keyOf(e)) && gone.has(parentOf(e))) {
          gone.add(keyOf(e))
          grew = true
        }
      }
    }
    setEntries((prev) => prev.filter((e) => !gone.has(keyOf(e))))
  }

  const restore = async (entry) => {
    // Restoring a task brings back its trashed list too; refetch to show that.
    const listComesBack = entry.kind === 'todoTask' && trashedKeys.has(parentOf(entry))
    removeTree(entry)
    try {
      await api(`${KINDS[entry.kind].path(entry.item)}/restore`, { method: 'POST' })
      if (listComesBack) fetchTrash()
      toast.success(`Restored “${entry.item.title}”`)
    } catch {
      toast.error('Could not restore. Please try again.')
      fetchTrash()
    }
  }

  const purge = async (entry) => {
    setConfirm(null)
    removeTree(entry)
    try {
      await api(`${KINDS[entry.kind].path(entry.item)}/purge`, { method: 'DELETE' })
    } catch {
      toast.error('Could not delete permanently. Please try again.')
      fetchTrash()
    }
  }

  const emptyTrash = async () => {
    setConfirm(null)
    setEmptying(true)
    // Outermost items only; purging a folder removes what's inside it.
    const targets = visible
    setEntries([])
    const results = await Promise.allSettled(
      targets.map((e) => api(`${KINDS[e.kind].path(e.item)}/purge`, { method: 'DELETE' })),
    )
    setEmptying(false)
    if (results.some((r) => r.status === 'rejected')) {
      toast.error('Some items could not be deleted. Please try again.')
      fetchTrash()
    }
  }

  const workspaceName = (item) =>
    activeWorkspace && item.workspaceId && String(item.workspaceId) !== String(activeWorkspace.id)
      ? workspaces.find((ws) => String(ws.id) === String(item.workspaceId))?.name
      : null

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Trash2 className="h-6 w-6 text-red-400" />
            Trash
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Deleted resources, notes and TODOs. Restore them, or delete them for good.
          </p>
        </div>
        {visible.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-500"
            disabled={emptying}
            onClick={() => setConfirm({ all: true })}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> {emptying ? 'Emptying…' : 'Empty Trash'}
          </Button>
        )}
      </div>

      {loadError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold">Couldn't load the Trash</h3>
          <Button className="mt-4" variant="outline" onClick={fetchTrash}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-2xl bg-muted/50 p-6">
            <Trash2 className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-semibold">Trash is empty</h3>
          <p className="mt-1 text-sm text-muted-foreground">Deleted resources, notes and TODOs will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((entry) => {
            const { kind, item } = entry
            const isFolder = item.type === 'folder' || entry.isFolder
            const inside = isFolder ? insideCount(entry) : 0
            const otherWorkspace = workspaceName(item)
            return (
              <div
                key={`${kind}-${item.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 opacity-70">
                  {item.type === 'folder' ? (
                    <FolderGlyph icon={item.icon} color={item.color || item.metadata?.color} size="md" />
                  ) : kind === 'todoList' ? (
                    <ListTodo className="h-5 w-5 text-muted-foreground/70" strokeWidth={1.5} />
                  ) : kind === 'todoTask' ? (
                    <CircleCheck className="h-5 w-5 text-muted-foreground/70" strokeWidth={1.5} />
                  ) : kind === 'note' ? (
                    <NotebookPen className="h-5 w-5 text-muted-foreground/70" strokeWidth={1.5} />
                  ) : (
                    <Globe className="h-5 w-5 text-muted-foreground/50" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium">{item.title}</h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {KINDS[kind].label(item)}
                    {inside > 0 ? ` · includes ${inside} deleted item${inside === 1 ? '' : 's'}` : ''}
                    {otherWorkspace ? ` · ${otherWorkspace}` : ''}
                    {item.deletedAt ? ` · deleted ${formatDeleted(item.deletedAt)}` : ''}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => restore(entry)} title="Restore">
                    <RotateCcw className="h-4 w-4 text-green-500 sm:mr-1.5" />
                    <span className="hidden sm:inline">Restore</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirm({ entry })}
                    title="Delete permanently"
                    aria-label={`Delete ${item.title} permanently`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.all ? 'Empty Trash?' : 'Delete permanently?'}
      >
        <p className="text-sm text-muted-foreground">
          {confirm?.all
            ? `All ${visible.length} item${visible.length === 1 ? '' : 's'} in the Trash, and everything inside deleted folders and lists, will be gone for good.`
            : `“${confirm?.entry?.item.title}”${confirm?.entry?.item.type === 'folder' || confirm?.entry?.isFolder ? ' and everything inside it' : ''} will be gone for good.`}{' '}
          This can't be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-500"
            onClick={() => (confirm?.all ? emptyTrash() : purge(confirm.entry))}
          >
            {confirm?.all ? 'Empty Trash' : 'Delete permanently'}
          </Button>
        </div>
      </Dialog>
    </section>
  )
}
