import { useState, useEffect, useCallback } from 'react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { Folder , ChevronRight, CornerDownRight } from 'lucide-react'

export function MoveDialog({ open, onClose, onSubmit, api, workspaceId, basePath = '/items' }) {
  const [folders, setFolders] = useState([])
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchFolders = useCallback(async (parentId) => {
    if (!workspaceId) return
    try {
      const data = await api(`${basePath}?workspaceId=${workspaceId}${parentId ? `&parentId=${parentId}` : ''}`)
      setFolders((data.items ?? data.folders ?? []).filter((folder) => folder.type === 'folder'))
      setBreadcrumbs(data.breadcrumbs ?? [])
    } catch {
      // ignore
    }
  }, [api, workspaceId, basePath])

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        void fetchFolders(null)
      })
    }
  }, [open, fetchFolders])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await onSubmit(selected)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Move to Folder">
      <div className="space-y-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <button
            onClick={() => {
              fetchFolders(null)
              setSelected(null)
            }}
            className="hover:text-foreground transition-colors"
          >
            Root
          </button>
          {breadcrumbs.map((b) => (
            <span key={b.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              <button
                onClick={() => fetchFolders(b.id)}
                className="hover:text-foreground transition-colors"
              >
                {b.title}
              </button>
            </span>
          ))}
        </div>

        {/* Root option */}
        <button
          onClick={() => setSelected(null)}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            selected === null ? 'bg-primary/10 text-primary border border-primary/30' : 'hover:bg-muted border border-transparent'
          }`}
        >
          <CornerDownRight className="h-4 w-4" />
          Root (top level)
        </button>

        {/* Folder list */}
        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {folders.map((folder) => (
            <div key={folder.id} className="flex items-center gap-1">
              <button
                onClick={() => setSelected(folder.id)}
                className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  selected === folder.id
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'hover:bg-muted border border-transparent'
                }`}
              >
                <Folder className="h-4 w-4" />
                {folder.title}
              </button>
              <button
                onClick={() => fetchFolders(folder.id)}
                className="rounded-md p-1.5 hover:bg-muted transition-colors text-muted-foreground"
                title="Open folder"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ))}
          {folders.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No subfolders</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Moving...' : 'Move Here'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
