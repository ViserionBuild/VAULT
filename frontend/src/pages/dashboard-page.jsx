import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Folder, Globe, Star, Clock, Plus, FolderPlus,
  ArrowRight, Sparkles, TrendingUp
} from 'lucide-react'
import { useAuth } from '../contexts/auth-context'
import { useApi } from '../hooks/use-api'
import { useWorkspace } from '../contexts/workspace-context'
import { Button } from '../components/ui/button'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const { user } = useAuth()
  const api = useApi()
  const { activeWorkspace } = useWorkspace()
  const navigate = useNavigate()

  const [recentItems, setRecentItems] = useState([])
  const [favoriteItems, setFavoriteItems] = useState([])
  const [stats, setStats] = useState({ total: 0, folders: 0, urls: 0, favorites: 0 })

  const fetchData = useCallback(async () => {
    if (!activeWorkspace) return
    try {
      const [favs, items] = await Promise.all([
        api('/items/favorites'),
        api(`/items?workspaceId=${activeWorkspace.id}&sortBy=updatedAt&sortOrder=desc`),
      ])
      setFavoriteItems(favs?.slice(0, 6) ?? [])
      const allItems = items?.items ?? []
      setRecentItems(allItems.slice(0, 8))
      setStats({
        total: allItems.length,
        folders: allItems.filter((i) => i.type === 'folder').length,
        urls: allItems.filter((i) => i.type === 'url').length,
        favorites: favs?.length ?? 0,
      })
    } catch {
      // ignore
    }
  }, [api, activeWorkspace])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <section className="space-y-8">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, {user?.name?.split(' ')[0]} <span className="inline-block animate-bounce">👋</span>
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening in your vault today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/resources')} variant="outline" className="gap-2">
          <FolderPlus className="h-4 w-4" /> New Folder
        </Button>
        <Button onClick={() => navigate('/resources')} className="gap-2">
          <Plus className="h-4 w-4" /> Add Resource
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Items', value: stats.total, icon: TrendingUp, color: 'text-primary' },
          { label: 'Folders', value: stats.folders, icon: Folder, color: 'text-blue-400' },
          { label: 'Resources', value: stats.urls, icon: Globe, color: 'text-emerald-400' },
          { label: 'Favorites', value: stats.favorites, icon: Star, color: 'text-yellow-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-background p-4 transition-all hover:shadow-md hover:border-primary/20"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Favorites Strip */}
      {favoriteItems.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400" fill="currentColor" />
              Favorites
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/favorites')}>
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {favoriteItems.map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  item.type === 'folder'
                    ? navigate('/resources')
                    : item.url && window.open(item.url, '_blank')
                }
                className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm transition-all hover:shadow-md hover:border-primary/30"
              >
                {item.type === 'folder' ? (
                  <Folder className="h-4 w-4 text-primary/70" />
                ) : (
                  <Globe className="h-4 w-4 text-muted-foreground/50" />
                )}
                <span className="max-w-[150px] truncate">{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Items */}
      {recentItems.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent Items
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/resources')}>
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {recentItems.map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  item.type === 'folder'
                    ? navigate('/resources')
                    : item.url && window.open(item.url, '_blank')
                }
                className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-left transition-all hover:shadow-md hover:border-primary/30"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                  {item.type === 'folder' ? (
                    <Folder className="h-4 w-4 text-primary/70" />
                  ) : item.icon ? (
                    <img src={item.icon} alt="" className="h-4 w-4" onError={(e) => { e.target.style.display = 'none' }} />
                  ) : (
                    <Globe className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.type === 'folder' ? 'Folder' : item.url ? new URL(item.url).hostname : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {recentItems.length === 0 && favoriteItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-6">
            <Sparkles className="h-12 w-12 text-primary/50" />
          </div>
          <h3 className="text-xl font-semibold">Welcome to VAULT</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Your personal resource hub is ready. Start by adding your first folder or saving a URL resource.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => navigate('/resources')}>
              <FolderPlus className="mr-1.5 h-4 w-4" /> Create Folder
            </Button>
            <Button onClick={() => navigate('/resources')}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Resource
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
