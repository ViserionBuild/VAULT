import { useCallback, useEffect, useState } from 'react'
import { Star, RefreshCw, ExternalLink, Folder, Globe } from 'lucide-react'
import { useApi } from '../hooks/use-api'
import { Badge } from '../components/ui/badge'

export function FavoritesPage() {
  const api = useApi()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFavorites = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api('/items/favorites')
      setItems(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const handleUnfavorite = async (id) => {
    await api(`/items/${id}/favorite`, { method: 'POST' })
    fetchFavorites()
  }

  const handleOpen = (item) => {
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer')
    }
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-400" fill="currentColor" />
          Favorites
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your starred items across all folders and workspaces.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-2xl bg-muted/50 p-6">
            <Star className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-semibold">No favorites yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Star items in Resources to see them here for quick access.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-all hover:shadow-md hover:border-primary/30 cursor-pointer"
              onClick={() => handleOpen(item)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                {item.type === 'folder' ? (
                  <Folder className="h-5 w-5 text-primary/70" />
                ) : item.icon ? (
                  <img src={item.icon} alt="" className="h-5 w-5" onError={(e) => { e.target.style.display = 'none' }} />
                ) : (
                  <Globe className="h-5 w-5 text-muted-foreground/50" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{item.title}</h3>
                {item.url && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground/60 truncate">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    {new URL(item.url).hostname}
                  </p>
                )}
              </div>

              {item.tags?.length > 0 && (
                <div className="hidden sm:flex items-center gap-1">
                  {item.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag.id} style={{ borderColor: tag.color, color: tag.color }}>
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}

              <button
                className="text-yellow-400 hover:text-muted-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  handleUnfavorite(item.id)
                }}
                title="Remove from favorites"
              >
                <Star className="h-4 w-4" fill="currentColor" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
