import {
  Folder,
  ExternalLink,
  Star,
  MoreVertical,
  Globe,
} from 'lucide-react'
import defaultLinkIcon from '../../assets/default_link_icon.png'
import { Badge } from '../ui/badge'

export function ResourceCard({ item, onOpen, onContextMenu, onFavorite, isSelected, onSelect }) {
  const isFolder = item.type === 'folder'
  const folderColor = item.color || item.metadata?.color
  const folderTint = folderColor ? withAlpha(folderColor, 0.16) : null

  return (
    <div
      className={`group relative flex flex-col rounded-xl border border-border bg-background p-2 transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 cursor-pointer ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      }`}
      style={isFolder && folderTint ? { backgroundColor: folderTint, borderColor: folderColor } : {}}
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

      {/* Favorite + Menu */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <button
          className={`${
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
        <button
          className="rounded-md p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-muted transition-all"
          onClick={(e) => {
            e.stopPropagation()
            onContextMenu(e, item)
          }}
          aria-label="Open menu"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Icon */}
      <div className="flex h-20 items-center justify-center">
        {isFolder ? (
          item.icon ? (
            <span
              className="text-3xl"
              style={folderColor ? { color: folderColor } : {}}
            >
              {item.icon}
            </span>
          ) : (
            <Folder
              className="h-12 w-12 text-primary/60"
              style={folderColor ? { color: folderColor } : {}}
            />
          )
        ) : item.icon ? (
          item.icon.startsWith('http') ? (
            <div className="flex h-10 w-10 items-center justify-center">
              <img
                src={item.icon}
                alt=""
                className="h-8 w-8"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'block'
                }}
              />
              <img
                src={defaultLinkIcon}
                alt=""
                className="hidden h-7 w-7"
              />
            </div>
          ) : (
            <span className="text-2xl">{item.icon}</span>
          )
        ) : (
          <Globe className="h-10 w-10 text-muted-foreground/40" />
        )}
      </div>

      {/* Title */}
      <div className="mt-2 text-center">
        <h3 className="text-sm font-medium text-foreground truncate">
          {item.title}
        </h3>
      </div>

      {/* Tags intentionally hidden in grid view */}
    </div>
  )
}

export function ResourceListItem({ item, onOpen, onContextMenu, onFavorite, isSelected, onSelect }) {
  const isFolder = item.type === 'folder'
  const folderColor = item.color || item.metadata?.color
  const folderTint = folderColor ? withAlpha(folderColor, 0.16) : null

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-all hover:shadow-md hover:border-primary/30 cursor-pointer ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      }`}
      style={isFolder && folderTint ? { backgroundColor: folderTint, borderColor: folderColor } : {}}
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

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          isFolder && folderTint ? 'bg-transparent' : 'bg-muted/50'
        }`}
      >
        {isFolder ? (
          item.icon ? (
            <span
              className="text-lg"
                style={folderColor ? { color: folderColor } : {}}
            >
              {item.icon}
            </span>
          ) : (
            <Folder
              className="h-5 w-5 text-primary/70"
              style={folderColor ? { color: folderColor } : {}}
            />
          )
        ) : item.icon ? (
          item.icon.startsWith('http') ? (
            <div className="flex h-5 w-5 items-center justify-center">
              <img
                src={item.icon}
                alt=""
                className="h-5 w-5"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'block'
                }}
              />
              <img
                src={defaultLinkIcon}
                alt=""
                className="hidden h-4 w-4"
              />
            </div>
          ) : (
            <span className="text-sm">{item.icon}</span>
          )
        ) : (
          <Globe className="h-5 w-5 text-muted-foreground/50" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm truncate">{item.title}</h3>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate">
            {item.description}
          </p>
        )}
        {item.url && (
          <a
            href={
              item.url.startsWith('http')
                ? item.url
                : `https://${item.url}`
            }
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-muted-foreground/60 truncate hover:text-primary"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            {extractDomain(item.url)}
          </a>
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

      <div className="flex items-center gap-1">
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
        <button
          className="rounded-md p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onContextMenu(e, item)
          }}
          aria-label="Open menu"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function ResourceTable({ items, onOpen, onContextMenu, onFavorite, selectedIds, onSelect, onSort, sortBy, sortOrder }) {
  const columns = [
    { key: 'title', label: 'Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'url', label: 'URL', sortable: false },
    { key: 'description', label: 'Description', sortable: false },
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
            <th className="w-14 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className={`border-b border-border/50 transition-colors hover:bg-muted/20 cursor-pointer ${
                selectedIds.includes(item.id) ? 'bg-primary/5' : ''
              }`}
              style={item.type === 'folder' && item.color ? { backgroundColor: withAlpha(item.color, 0.12) } : {}}
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
                    item.icon ? (
                      <span
                        className="text-sm shrink-0"
                        style={item.color || item.metadata?.color ? { color: item.color || item.metadata?.color } : {}}
                      >
                        {item.icon}
                      </span>
                    ) : (
                      <Folder
                        className="h-4 w-4 text-primary/70 shrink-0"
                        style={item.color || item.metadata?.color ? { color: item.color || item.metadata?.color } : {}}
                      />
                    )
                  ) : item.icon ? (
                    item.icon.startsWith('http') ? (
                      <div className="flex h-4 w-4 items-center justify-center">
                        <img
                          src={item.icon}
                          alt=""
                          className="h-4 w-4 shrink-0"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'block'
                          }}
                        />
                        <img
                          src={defaultLinkIcon}
                          alt=""
                          className="hidden h-3 w-3"
                        />
                      </div>
                    ) : (
                      <span className="text-xs">{item.icon}</span>
                    )
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
              <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[200px]">
                {item.description || '—'}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                {new Date(item.updatedAt).toLocaleDateString()}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                {new Date(item.createdAt).toLocaleDateString()}
              </td>
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1">
                  <button
                    className={`${
                      item.isFavorite ? 'text-yellow-400' : 'text-muted-foreground/30 hover:text-yellow-400'
                    } transition-colors`}
                    onClick={() => onFavorite(item.id)}
                  >
                    <Star className="h-4 w-4" fill={item.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className="rounded-md p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
                    onClick={(e) => onContextMenu(e, item)}
                    aria-label="Open menu"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
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

function withAlpha(color, alpha) {
  if (!color) return null
  const hex = color.replace('#', '')
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16)
    const g = parseInt(hex[1] + hex[1], 16)
    const b = parseInt(hex[2] + hex[2], 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return null
}
