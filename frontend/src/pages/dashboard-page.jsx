import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Folder, Globe, Star, Clock, Plus, FolderPlus, ArrowRight, Sparkles, NotebookPen, RefreshCw,
} from 'lucide-react'
import { useAuth } from '../contexts/auth-context'
import { useApi } from '../hooks/use-api'
import { useWorkspace } from '../contexts/workspace-context'
import { hostOf, useOpenItem } from '../hooks/use-open-item'
import { Button } from '../components/ui/button'
import { FolderGlyph } from '../components/resources/folder-appearance'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function ItemIcon({ item, kind }) {
  if (item.type === 'folder') return <FolderGlyph icon={item.icon} color={item.color || item.metadata?.color} size="sm" />
  if (kind === 'note') return <NotebookPen className="h-4 w-4 text-muted-foreground/70" strokeWidth={1.5} />
  if (item.icon?.startsWith('http')) {
    return (
      <img
        src={item.icon}
        alt=""
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  }
  return <Globe className="h-4 w-4 text-muted-foreground/50" />
}

export function DashboardPage() {
  const { user } = useAuth()
  const api = useApi()
  const openItem = useOpenItem()
  const { activeWorkspace } = useWorkspace()
  const navigate = useNavigate()

  const [overview, setOverview] = useState(null)
  const [favorites, setFavorites] = useState([]) // { kind, item } in this workspace
  const [loadError, setLoadError] = useState(false)

  const fetchData = useCallback(async () => {
    if (!activeWorkspace) return
    setLoadError(false)
    try {
      const [data, favResources, favNotes] = await Promise.all([
        api(`/items/overview?workspaceId=${activeWorkspace.id}`),
        api('/items/favorites'),
        api('/notes/favorites'),
      ])
      setOverview(data)
      const inWorkspace = (item) => String(item.workspaceId) === String(activeWorkspace.id)
      setFavorites(
        [
          ...(favResources ?? []).filter(inWorkspace).map((item) => ({ kind: 'resource', item })),
          ...(favNotes ?? []).filter(inWorkspace).map((item) => ({ kind: 'note', item })),
        ].sort((a, b) => String(b.item.updatedAt).localeCompare(String(a.item.updatedAt))),
      )
    } catch {
      setLoadError(true)
    }
  }, [api, activeWorkspace])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchData()
    })
  }, [fetchData])

  const counts = overview?.counts ?? { folders: 0, links: 0, notes: 0 }
  const recentResources = overview?.recentResources ?? []
  const recentNotes = overview?.recentNotes ?? []
  const isEmpty = overview && counts.folders + counts.links + counts.notes === 0

  const stats = [
    { label: 'Folders', value: counts.folders, icon: Folder, color: 'text-blue-400', to: '/resources' },
    { label: 'Links', value: counts.links, icon: Globe, color: 'text-emerald-400', to: '/resources' },
    { label: 'Notes', value: counts.notes, icon: NotebookPen, color: 'text-primary', to: '/notes' },
    { label: 'Favorites', value: favorites.length, icon: Star, color: 'text-yellow-400', to: '/favorites' },
  ]

  return (
    <section className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, {user?.name?.split(' ')[0]} <span aria-hidden="true">👋</span>
        </h1>
        <p className="text-muted-foreground">
          Here's what's in {activeWorkspace ? activeWorkspace.name : 'your vault'}.
        </p>
      </div>

      {/* Quick actions open the right dialog/editor on arrival. */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/resources?new=folder')} variant="outline" className="gap-2">
          <FolderPlus className="h-4 w-4" /> New folder
        </Button>
        <Button onClick={() => navigate('/resources?new=link')} className="gap-2">
          <Plus className="h-4 w-4" /> Add link
        </Button>
        <Button onClick={() => navigate('/notes?new=note')} variant="outline" className="gap-2">
          <NotebookPen className="h-4 w-4" /> New note
        </Button>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          Couldn't load your overview.
          <Button size="sm" variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => navigate(stat.to)}
            className="rounded-xl border border-border bg-background p-4 text-left transition-all hover:border-primary/20 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="mt-2 text-3xl font-bold">{overview ? stat.value : '–'}</p>
          </button>
        ))}
      </div>

      {favorites.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Star className="h-5 w-5 text-yellow-400" fill="currentColor" />
              Favorites
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/favorites')}>
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {favorites.slice(0, 8).map(({ kind, item }) => (
              <button
                key={`${kind}-${item.id}`}
                onClick={() => openItem(item, kind)}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <ItemIcon item={item} kind={kind} />
                <span className="max-w-[150px] truncate">{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {recentResources.length > 0 && (
          <RecentList
            title="Recent resources"
            onViewAll={() => navigate('/resources')}
            entries={recentResources.map((item) => ({ kind: 'resource', item }))}
            subtitle={(item) => (item.type === 'folder' ? 'Folder' : hostOf(item.url))}
            onOpen={openItem}
          />
        )}
        {recentNotes.length > 0 && (
          <RecentList
            title="Recent notes"
            onViewAll={() => navigate('/notes')}
            entries={recentNotes.map((item) => ({ kind: 'note', item }))}
            subtitle={(item) =>
              new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }
            onOpen={openItem}
          />
        )}
      </div>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-6">
            <Sparkles className="h-12 w-12 text-primary/50" />
          </div>
          <h3 className="text-xl font-semibold">Welcome to VAULT</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Save your first link, write a note, or create a folder to get organized.
          </p>
        </div>
      )}
    </section>
  )
}

function RecentList({ title, entries, subtitle, onOpen, onViewAll }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Clock className="h-5 w-5 text-muted-foreground" />
          {title}
        </h2>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          View all <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-2">
        {entries.map(({ kind, item }) => (
          <button
            key={`${kind}-${item.id}`}
            onClick={() => onOpen(item, kind)}
            className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-left transition-all hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
              <ItemIcon item={item} kind={kind} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{subtitle(item)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
