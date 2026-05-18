import {
  Folder,
  ExternalLink,
  Star,
  MoreVertical,
  Globe,
} from 'lucide-react'
import { Badge } from '../ui/badge'

export function ResourceCard({ item, onOpen, onContextMenu, onFavorite, isSelected, onSelect }) {
  const isFolder = item.type === 'folder'

  return (
    <div
      className={`group relative flex flex-col rounded-xl border border-border bg-background p-4 transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 cursor-pointer ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      }`}
      onClick={() => onOpen(item)}
      onContextMenu={(e) => onContextMenu(e, item)}
    >
      {/* Selection checkbox */}
      <div
        className={`absolute top-3 left-3 z-10 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item.id)}
          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
        />
      </div>

      {/* Favorite button */}
      <button
        className={`absolute top-3 right-3 z-10 ${
          item.isFavorite
            ? 'text-yellow-400'
            : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-yellow-400'
        } transition-all`}
        onClick={(e) => {
          e.stopPropagation()
          onFavorite(item.id)
        }}
      >
        <Star className="h-4 w-4" fill={item.isFavorite ? 'currentColor' : 'none'} />
      </button>

      {/* Thumbnail / Icon */}
      <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-lg bg-muted/50">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
        ) : null}
        <div
          className={`flex h-full w-full items-center justify-center ${item.thumbnail ? 'hidden' : ''}`}
          style={item.thumbnail ? { display: 'none' } : {}}
        >
          {isFolder ? (
            <Folder className="h-12 w-12 text-primary/60" style={item.metadata?.color ? { color: item.metadata.color } : {}} />
          ) : item.icon ? (
            <img src={item.icon} alt="" className="h-8 w-8" onError={(e) => { e.target.style.display = 'none' }} />
          ) : (
            <Globe className="h-10 w-10 text-muted-foreground/40" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 space-y-1">
        <h3 className="font-medium text-sm leading-snug line-clamp-2 text-foreground">
          {item.icon && !isFolder && !item.icon.startsWith('http') ? (
            <span className="mr-1.5">{item.icon}</span>
          ) : null}
          {item.title}
        </h3>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        )}
        {item.url && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground/60 truncate">
            <ExternalLink className="h-3 w-3 shrink-0" />
            {extractDomain(item.url)}
          </p>
        )}
      </div>

      {/* Tags */}
      {item.tags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <Badge key={tag.id} style={{ borderColor: tag.color, color: tag.color }}>
              {tag.name}
            </Badge>
          ))}
          {item.tags.length > 3 && (
            <Badge>+{item.tags.length - 3}</Badge>
          )}
        </div>
      )}
    </div>
  )
}

export function ResourceListItem({ item, onOpen, onContextMenu, onFavorite, isSelected, onSelect }) {
  const isFolder = item.type === 'folder'

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-all hover:shadow-md hover:border-primary/30 cursor-pointer ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      }`}
      onClick={() => onOpen(item)}
      onContextMenu={(e) => onContextMenu(e, item)}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item.id)}
          className={`h-4 w-4 rounded border-border accent-primary cursor-pointer ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          } transition-opacity`}
        />
      </div>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50">
        {isFolder ? (
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
            {extractDomain(item.url)}
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

      <span className="text-xs text-muted-foreground/50 hidden md:block whitespace-nowrap">
        {new Date(item.updatedAt).toLocaleDateString()}
      </span>

      <button
        className={`${
          item.isFavorite ? 'text-yellow-400' : 'text-muted-foreground/40 hover:text-yellow-400'
        } transition-colors`}
        onClick={(e) => {
          e.stopPropagation()
          onFavorite(item.id)
        }}
      >
        <Star className="h-4 w-4" fill={item.isFavorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

export function ResourceTable({ items, onOpen, onContextMenu, onFavorite, selectedIds, onSelect, onSort, sortBy, sortOrder }) {
  const columns = [
    { key: 'title', label: 'Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'url', label: 'URL', sortable: false },
    { key: 'updatedAt', label: 'Modified', sortable: true },
    { key: 'createdAt', label: 'Created', sortable: true },
  ]

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 border-b border-border">
          <tr>
            <th className="w-10 px-3 py-2.5">
              <input
                type="checkbox"
                checked={selectedIds.length === items.length && items.length > 0}
                onChange={() => {
                  if (selectedIds.length === items.length) {
                    onSelect([])
                  } else {
                    onSelect(items.map((i) => i.id))
                  }
                }}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-left font-medium text-muted-foreground ${
                  col.sortable ? 'cursor-pointer hover:text-foreground select-none' : ''
                }`}
                onClick={() => col.sortable && onSort(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {sortBy === col.key && (
                    <span className="text-primary">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </span>
              </th>
            ))}
            <th className="w-10 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className={`border-b border-border/50 transition-colors hover:bg-muted/20 cursor-pointer ${
                selectedIds.includes(item.id) ? 'bg-primary/5' : ''
              }`}
              onClick={() => onOpen(item)}
              onContextMenu={(e) => onContextMenu(e, item)}
            >
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => {
                    if (selectedIds.includes(item.id)) {
                      onSelect(selectedIds.filter((id) => id !== item.id))
                    } else {
                      onSelect([...selectedIds, item.id])
                    }
                  }}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {item.type === 'folder' ? (
                    <Folder className="h-4 w-4 text-primary/70 shrink-0" />
                  ) : item.icon ? (
                    <img src={item.icon} alt="" className="h-4 w-4 shrink-0" onError={(e) => { e.target.style.display = 'none' }} />
                  ) : (
                    <Globe className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  )}
                  <span className="font-medium truncate max-w-[200px]">{item.title}</span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <Badge>{item.type}</Badge>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[200px]">
                {item.url ? extractDomain(item.url) : '—'}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                {new Date(item.updatedAt).toLocaleDateString()}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                {new Date(item.createdAt).toLocaleDateString()}
              </td>
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`${
                    item.isFavorite ? 'text-yellow-400' : 'text-muted-foreground/30 hover:text-yellow-400'
                  } transition-colors`}
                  onClick={() => onFavorite(item.id)}
                >
                  <Star className="h-4 w-4" fill={item.isFavorite ? 'currentColor' : 'none'} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function extractDomain(url) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
