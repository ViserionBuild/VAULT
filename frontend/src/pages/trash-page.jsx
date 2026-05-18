import { useCallback, useEffect, useState } from 'react'
import { Trash2, RotateCcw, RefreshCw, Folder, Globe, AlertTriangle } from 'lucide-react'
import { useApi } from '../hooks/use-api'
import { Button } from '../components/ui/button'

export function TrashPage() {
  const api = useApi()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTrash = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api('/items/trash')
      setItems(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    fetchTrash()
  }, [fetchTrash])

  const handleRestore = async (id) => {
    await api(`/items/${id}/restore`, { method: 'POST' })
    fetchTrash()
  }

  const handlePurge = async (id) => {
    if (!confirm('Permanently delete this item? This cannot be undone.')) return
    await api(`/items/${id}/purge`, { method: 'DELETE' })
    fetchTrash()
  }

  const handleEmptyTrash = async () => {
    if (!confirm('Permanently delete all items in trash? This cannot be undone.')) return
    for (const item of items) {
      await api(`/items/${item.id}/purge`, { method: 'DELETE' })
    }
    fetchTrash()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-red-400" />
            Trash
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deleted items can be restored or permanently removed.
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="outline" size="sm" className="text-red-500" onClick={handleEmptyTrash}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Empty Trash
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-2xl bg-muted/50 p-6">
            <Trash2 className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-semibold">Trash is empty</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Deleted items will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 opacity-70 hover:opacity-100 transition-all"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                {item.type === 'folder' ? (
                  <Folder className="h-5 w-5 text-muted-foreground/50" />
                ) : (
                  <Globe className="h-5 w-5 text-muted-foreground/50" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate line-through decoration-muted-foreground/30">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Deleted {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : ''}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleRestore(item.id)} title="Restore">
                  <RotateCcw className="h-4 w-4 text-green-500" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handlePurge(item.id)} title="Delete permanently">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
