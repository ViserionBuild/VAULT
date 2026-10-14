import { useCallback, useEffect, useState } from 'react'
import { Star, RefreshCw, Globe, NotebookPen } from 'lucide-react'
import { useApi } from '../hooks/use-api'
import { useWorkspace } from '../contexts/workspace-context'
import { hostOf, useOpenItem } from '../hooks/use-open-item'
import { Button } from '../components/ui/button'
import { useToast } from '../components/ui/toast'
import { FolderGlyph } from '../components/resources/folder-appearance'
import { TagChips } from '../components/tags/tag-chip'

// Resources and notes are starred separately; this page shows both.
const KIND_LABEL = {
  resource: { folder: 'Folder', url: 'Link' },
  note: { folder: 'Notes folder', note: 'Note' },
}

export function FavoritesPage() {
  const api = useApi()
  const toast = useToast()
  const openItem = useOpenItem()
  const { workspaces, activeWorkspace } = useWorkspace()
  const [entries, setEntries] = useState([]) // { kind, item }
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const fetchFavorites = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [resources, notes] = await Promise.all([api('/items/favorites'), api('/notes/favorites')])
      setEntries(
        [
          ...(resources ?? []).map((item) => ({ kind: 'resource', item })),
          ...(notes ?? []).map((item) => ({ kind: 'note', item })),
        ].sort((a, b) => String(b.item.updatedAt).localeCompare(String(a.item.updatedAt))),
      )
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchFavorites()
    })
  }, [fetchFavorites])

  const unfavorite = async ({ kind, item }) => {
    setEntries((prev) => prev.filter((entry) => entry.item.id !== item.id))
    try {
      await api(`/${kind === 'note' ? 'notes' : 'items'}/${item.id}/favorite`, { method: 'POST' })
    } catch {
      toast.error('Could not update favorite. Please try again.')
      fetchFavorites()
    }
  }

  // Favorites span workspaces; name the workspace when it isn't the open one.
  const workspaceName = (item) =>
    activeWorkspace && String(item.workspaceId) !== String(activeWorkspace.id)
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
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Star className="h-6 w-6 text-yellow-400" fill="currentColor" />
          Favorites
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Starred resources and notes from every folder and workspace.
        </p>
      </div>

      {loadError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold">Couldn't load your favorites</h3>
          <Button className="mt-4" variant="outline" onClick={fetchFavorites}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
          </Button>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-2xl bg-muted/50 p-6">
            <Star className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-semibold">No favorites yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Star resources or notes to keep them one tap away here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const { kind, item } = entry
            const otherWorkspace = workspaceName(item)
            return (
              <div
                key={`${kind}-${item.id}`}
                role="button"
                tabIndex={0}
                onClick={() => openItem(item, kind)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target === e.currentTarget) openItem(item, kind)
                }}
                className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 outline-none transition-all hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                  {item.type === 'folder' ? (
                    <FolderGlyph icon={item.icon} color={item.color || item.metadata?.color} size="md" />
                  ) : kind === 'note' ? (
                    <NotebookPen className="h-5 w-5 text-muted-foreground/70" strokeWidth={1.5} />
                  ) : item.icon?.startsWith('http') ? (
                    <img
                      src={item.icon}
                      alt=""
                      className="h-5 w-5"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <Globe className="h-5 w-5 text-muted-foreground/50" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="truncate text-sm font-medium">{item.title}</h3>
                    <TagChips tags={item.tags} max={2} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {KIND_LABEL[kind][item.type] ?? 'Item'}
                    {item.url ? ` · ${hostOf(item.url)}` : ''}
                    {otherWorkspace ? ` · in ${otherWorkspace}` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  className="rounded-md p-2 text-yellow-400 transition-colors hover:bg-muted hover:text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    unfavorite(entry)
                  }}
                  aria-label={`Remove ${item.title} from favorites`}
                  title="Remove from favorites"
                >
                  <Star className="h-4 w-4" fill="currentColor" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
