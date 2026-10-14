import { useState } from 'react'
import {
  ExternalLink,
  Star,
  MoreVertical,
  Globe,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import defaultLinkIcon from '../../assets/default_link_icon.png'
import { Badge } from '../ui/badge'
import { FolderGlyph } from './folder-appearance'

// Stored URLs may lack a scheme; without one the browser treats them as
// relative paths on this site.
const linkHref = (item) => (item.url.startsWith('http') ? item.url : `https://${item.url}`)

/**
 * Wraps an item's icon. For a link it is a real anchor, so clicking the icon
 * opens the site and hovering shows the URL in the browser's status bar (plus
 * middle-click, Cmd/Ctrl+click and long-press menus). Other items get a span.
 */
function IconLink({ item, className, children }) {
  if (item.type !== 'url' || !item.url) {
    return <span className={className}>{children}</span>
  }
  return (
    <a
      href={linkHref(item)}
      target="_blank"
      rel="noopener noreferrer"
      // The row/tile also opens on click; stop it so the link opens once.
      onClick={(e) => e.stopPropagation()}
      aria-label={`Open ${item.title}`}
      className={`${className} rounded hover:ring-1 hover:ring-primary/40`}
    >
      {children}
    </a>
  )
}

// Drag-and-drop wiring from useItemDragDrop (optional): every item can be
// dragged, and folders also accept drops.
const dragProps = (dnd, item) =>
  dnd ? { ...dnd.itemProps(item), ...(item.type === 'folder' ? dnd.dropProps(item.id) : {}) } : {}
// Keyboard: every item is focusable; Enter opens it, Space toggles selection.
// (Arrow keys, Ctrl/Cmd+A, Delete and Escape are handled by the page.)
const keyboardProps = (item, onOpen, toggleSelect) => ({
  tabIndex: 0,
  'data-item-id': item.id,
  onKeyDown: (event) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter') {
      event.preventDefault()
      onOpen(item)
    } else if (event.key === ' ') {
      event.preventDefault()
      toggleSelect()
    }
  },
})
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-primary'

const dropHighlight = (dnd, item) =>
  item.type === 'folder' && dnd?.isDropTarget(item.id) ? 'ring-2 ring-primary bg-primary/10' : ''

export function ResourceCard({ item, onOpen, onContextMenu, onFavorite, isSelected, onSelect, dnd }) {
  const isFolder = item.type === 'folder'
  const folderColor = item.color || item.metadata?.color

  // Drive renders folders as compact rows and files as taller preview cards.
  return isFolder ? (
    <FolderTile
      item={item}
      color={folderColor}
      onOpen={onOpen}
      onContextMenu={onContextMenu}
      onFavorite={onFavorite}
      isSelected={isSelected}
      onSelect={onSelect}
      dnd={dnd}
    />
  ) : (
    <FileTile
      item={item}
      onOpen={onOpen}
      onContextMenu={onContextMenu}
      onFavorite={onFavorite}
      isSelected={isSelected}
      onSelect={onSelect}
      dnd={dnd}
    />
  )
}

function TileControls({ item, onFavorite, onContextMenu, isSelected, onSelect, tone = 'default' }) {
  // Over a preview image, controls sit on small chips so they stay readable.
  const chip = tone === 'onImage' ? 'bg-background/85 shadow-sm backdrop-blur-sm' : ''
  return (
    <>
      <div
        className={`absolute left-1 top-1 z-10 flex rounded transition-opacity ${chip} ${tone === 'onImage' ? 'p-1' : ''} ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 touch:invisible group-data-[selecting=true]/sel:visible group-data-[selecting=true]/sel:opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item.id)}
          className="h-3 w-3 rounded border-border accent-primary cursor-pointer"
          aria-label={`Select ${item.title}`}
        />
      </div>

      <div className={`absolute z-10 flex items-center gap-0.5 ${tone === 'onImage' ? 'right-1.5 top-1.5' : 'right-0.5 top-0.5'}`}>
        <button
          className={`rounded-full p-1 transition-all ${
            item.isFavorite
              ? 'text-yellow-400'
              : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-yellow-400 touch:hidden'
          } ${chip} ${tone === 'onTint' ? 'hover:bg-background/60' : 'hover:bg-muted'}`}
          onClick={(e) => {
            e.stopPropagation()
            onFavorite(item.id)
          }}
          aria-label={item.isFavorite ? 'Remove favorite' : 'Add favorite'}
        >
          <Star className="h-2.5 w-2.5" fill={item.isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button
          className={`rounded-full p-1 touch:p-1.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 touch:opacity-100 hover:text-foreground ${
            tone === 'onTint' ? 'hover:bg-background/60' : 'hover:bg-muted'
          } ${chip}`}
          onClick={(e) => {
            e.stopPropagation()
            onContextMenu(e, item)
          }}
          aria-label="Open menu"
        >
          <MoreVertical className="h-2.5 w-2.5 touch:h-4 touch:w-4" />
        </button>
      </div>
    </>
  )
}

function FolderTile({ item, color, onOpen, onContextMenu, onFavorite, isSelected, onSelect, dnd }) {
  // Windows Explorer icon view: glyph on top, name centered beneath it.
  return (
    <div
      className={`group relative flex cursor-pointer flex-col items-center gap-0.5 rounded border border-transparent px-1 pb-1 pt-1.5 transition-colors ${
        isSelected ? 'border-primary/40 bg-primary/10' : 'hover:bg-muted/60'
      } ${dropHighlight(dnd, item)} ${focusRing}`}
      onClick={() => onOpen(item)}
      onContextMenu={(e) => onContextMenu(e, item)}
      title={item.title}
      {...dragProps(dnd, item)}
      {...keyboardProps(item, onOpen, () => onSelect(item.id))}
    >
      <TileControls
        item={item}
        onFavorite={onFavorite}
        onContextMenu={onContextMenu}
        isSelected={isSelected}
        onSelect={onSelect}
      />

      <span className="flex h-9 w-9 items-center justify-center">
        <FolderGlyph icon={item.icon} color={color} size="lg" />
      </span>

      {/* Two lines max, like Explorer, so long names stay readable */}
      <span className="line-clamp-2 w-full text-center text-[11px] leading-tight">
        {item.title}
      </span>
    </div>
  )
}

function FileTile({ item, onOpen, onContextMenu, onFavorite, isSelected, onSelect, dnd }) {
  return (
    <div
      className={`group relative flex cursor-pointer flex-col items-center gap-0.5 rounded border border-transparent px-1 pb-1 pt-1.5 transition-colors ${
        isSelected ? 'border-primary/40 bg-primary/10' : 'hover:bg-muted/60'
      } ${dropHighlight(dnd, item)} ${focusRing}`}
      onClick={() => onOpen(item)}
      onContextMenu={(e) => onContextMenu(e, item)}
      title={item.title}
      {...dragProps(dnd, item)}
      {...keyboardProps(item, onOpen, () => onSelect(item.id))}
    >
      <TileControls
        item={item}
        onFavorite={onFavorite}
        onContextMenu={onContextMenu}
        isSelected={isSelected}
        onSelect={onSelect}
      />

      <IconLink item={item} className="flex h-9 w-9 items-center justify-center">
        {item.icon ? (
          item.icon.startsWith('http') ? (
            <img
              src={item.icon}
              alt=""
              className="h-7 w-7"
              onError={(e) => {
                e.target.src = defaultLinkIcon
              }}
            />
          ) : (
            <span className="text-2xl leading-none">{item.icon}</span>
          )
        ) : (
          <Globe className="h-7 w-7 text-muted-foreground/50" strokeWidth={1.5} />
        )}
      </IconLink>

      <span className="line-clamp-2 w-full text-center text-[11px] leading-tight">
        {item.title}
      </span>
    </div>
  )
}

function displayHost(item) {
  try {
    return new URL(linkHref(item)).hostname.replace(/^www\./, '')
  } catch {
    return item.url ?? ''
  }
}

// Cards view: a link's preview image (og:image) above its title, domain and
// description. Links without one get a tinted panel with their favicon.
export function ResourcePreviewCard({ item, onOpen, onContextMenu, onFavorite, isSelected, onSelect, dnd }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = item.thumbnail && !imageFailed
  const favicon = item.icon?.startsWith('http') ? item.icon : null
  const host = displayHost(item)

  return (
    <div
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-background transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/40'
      } ${focusRing}`}
      onClick={() => onOpen(item)}
      onContextMenu={(e) => onContextMenu(e, item)}
      title={item.title}
      {...dragProps(dnd, item)}
      {...keyboardProps(item, onOpen, () => onSelect(item.id))}
    >
      <TileControls
        item={item}
        onFavorite={onFavorite}
        onContextMenu={onContextMenu}
        isSelected={isSelected}
        onSelect={onSelect}
        tone="onImage"
      />

      <IconLink item={item} className="block aspect-[1.91/1] w-full overflow-hidden bg-muted">
        {showImage ? (
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            // Some image hosts refuse hotlinked requests that carry a referrer.
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-muted">
            <img src={favicon ?? defaultLinkIcon} alt="" className="h-10 w-10 rounded-lg opacity-80" />
          </span>
        )}
      </IconLink>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <div className="flex min-w-0 items-center gap-2">
          {favicon && (
            <img
              src={favicon}
              alt=""
              className="h-4 w-4 shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          )}
          <span className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</span>
        </div>
        {host && <span className="truncate text-xs text-muted-foreground">{host}</span>}
        {item.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground/80">{item.description}</p>
        )}
      </div>
    </div>
  )
}

const LIST_COLUMNS = [
  { key: 'title', label: 'Name', className: 'flex-1 min-w-0' },
  { key: 'type', label: 'Type', className: 'hidden sm:block w-24 shrink-0' },
  { key: 'updatedAt', label: 'Modified', className: 'hidden md:block w-32 shrink-0' },
]

function SortArrow({ active, sortOrder }) {
  const Icon = active && sortOrder === 'desc' ? ArrowDown : ArrowUp
  return (
    <Icon
      className={`h-3.5 w-3.5 transition-opacity ${
        active ? 'opacity-100 text-primary' : 'opacity-0 group-hover/sort:opacity-40'
      }`}
    />
  )
}

export function ResourceListHeader({ onSort, sortBy, sortOrder, allSelected, someSelected, onToggleAll }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
      <span className="flex w-4 shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            // Indeterminate is not an attribute; it must be set on the node.
            if (el) el.indeterminate = !allSelected && someSelected
          }}
          onChange={onToggleAll}
          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          aria-label="Select all items"
        />
      </span>

      {/* Spacer matching the row icon */}
      <span className="w-8 shrink-0" aria-hidden="true" />

      {LIST_COLUMNS.map((col) => {
        const active = sortBy === col.key
        return (
          <button
            key={col.key}
            type="button"
            onClick={() => onSort(col.key)}
            aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
            className={`group/sort flex items-center gap-1 text-left transition-colors hover:text-foreground ${
              active ? 'text-foreground' : ''
            } ${col.className}`}
          >
            <span className="truncate">{col.label}</span>
            <SortArrow active={active} sortOrder={sortOrder} />
          </button>
        )
      })}

      {/* Spacer matching the favorite + menu buttons */}
      <span className="w-[60px] shrink-0" aria-hidden="true" />
    </div>
  )
}

export function ResourceListItem({ item, onOpen, onContextMenu, onFavorite, isSelected, onSelect, dnd }) {
  const isFolder = item.type === 'folder'
  const folderColor = item.color || item.metadata?.color

  // Drive rows are flat and continuous: no card borders or shadows, just a
  // hover tint and a hairline divider between rows.
  return (
    <div
      className={`group flex cursor-pointer items-center gap-3 border-b border-border/50 px-3 py-2 transition-colors last:border-b-0 ${
        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
      } ${dropHighlight(dnd, item)} ${focusRing}`}
      onClick={() => onOpen(item)}
      onContextMenu={(e) => onContextMenu(e, item)}
      {...dragProps(dnd, item)}
      {...keyboardProps(item, onOpen, () => onSelect(item.id))}
    >
      <span className="flex w-4 shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item.id)}
          className={`h-4 w-4 rounded border-border accent-primary cursor-pointer transition-opacity ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 touch:invisible group-data-[selecting=true]/sel:visible group-data-[selecting=true]/sel:opacity-100'
          }`}
          aria-label={`Select ${item.title}`}
        />
      </span>

      <IconLink item={item} className="flex h-8 w-8 shrink-0 items-center justify-center">
        {isFolder ? (
          <FolderGlyph icon={item.icon} color={folderColor} size="md" />
        ) : item.icon?.startsWith('http') ? (
          <img
            src={item.icon}
            alt=""
            className="h-4 w-4"
            onError={(e) => {
              e.target.src = defaultLinkIcon
            }}
          />
        ) : item.icon ? (
          <span className="text-sm">{item.icon}</span>
        ) : (
          <Globe className="h-4 w-4 text-muted-foreground/50" />
        )}
      </IconLink>

      {/* Name column: title, with the domain as secondary text */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.title}</div>
        {item.url ? (
          <a
            href={linkHref(item)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            {extractDomain(item.url)}
          </a>
        ) : item.description ? (
          <div className="truncate text-xs text-muted-foreground">{item.description}</div>
        ) : null}
      </div>

      {/* Tags sit outside the sortable columns; hidden on narrow screens where
          the aligned columns take priority. */}
      {item.tags?.length > 0 && (
        <div className="hidden shrink-0 items-center gap-1 xl:flex">
          {item.tags.slice(0, 2).map((tag) => (
            <Badge key={tag.id} style={{ borderColor: tag.color, color: tag.color }}>
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Column widths mirror LIST_COLUMNS so rows align with the headers */}
      <span className="hidden w-24 shrink-0 text-xs text-muted-foreground sm:block">
        {isFolder ? 'Folder' : 'Link'}
      </span>

      <span className="hidden w-32 shrink-0 whitespace-nowrap text-xs text-muted-foreground md:block">
        {formatDate(item.updatedAt)}
      </span>

      <div className="flex w-[60px] shrink-0 items-center justify-end gap-0.5">
        <button
          className={`rounded-full p-1.5 transition-all ${
            item.isFavorite
              ? 'text-yellow-400'
              : 'text-muted-foreground/40 opacity-0 hover:text-yellow-400 group-hover:opacity-100 touch:hidden'
          } hover:bg-muted`}
          onClick={(e) => {
            e.stopPropagation()
            onFavorite(item.id)
          }}
          aria-label={item.isFavorite ? 'Remove favorite' : 'Add favorite'}
        >
          <Star className="h-3.5 w-3.5" fill={item.isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button
          className="rounded-full p-1.5 text-muted-foreground/60 opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100 touch:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            onContextMenu(e, item)
          }}
          aria-label="Open menu"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function ResourceTable({ items, onOpen, onContextMenu, onFavorite, selectedIds, onSelect, onSort, sortBy, sortOrder, dnd }) {
  const columns = [
    { key: 'title', label: 'Name', sortable: true, className: 'min-w-[220px]' },
    { key: 'url', label: 'Location', sortable: false, className: 'hidden lg:table-cell w-56' },
    { key: 'updatedAt', label: 'Modified', sortable: true, className: 'hidden sm:table-cell w-36' },
    { key: 'createdAt', label: 'Created', sortable: true, className: 'hidden xl:table-cell w-36' },
  ]

  const allSelected = items.length > 0 && selectedIds.length === items.length
  const someSelected = selectedIds.length > 0 && !allSelected

  const toggleAll = () => {
    onSelect(allSelected ? [] : items.map((item) => item.id))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="w-10 px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected
                }}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                aria-label="Select all items"
              />
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                aria-sort={
                  sortBy === col.key ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'
                }
                className={`px-3 py-2 text-left text-xs font-medium text-muted-foreground ${
                  col.sortable ? 'cursor-pointer select-none hover:text-foreground' : ''
                } ${col.className ?? ''}`}
                onClick={() => col.sortable && onSort(col.key)}
              >
                <span className="group/sort flex items-center gap-1">
                  {col.label}
                  {col.sortable && <SortArrow active={sortBy === col.key} sortOrder={sortOrder} />}
                </span>
              </th>
            ))}
            <th className="w-[72px] px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isFolder = item.type === 'folder'
            const folderColor = item.color || item.metadata?.color
            const isSelected = selectedIds.includes(item.id)

            return (
              <tr
                key={item.id}
                className={`group cursor-pointer border-b border-border/50 transition-colors last:border-b-0 ${
                  isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                } ${dropHighlight(dnd, item)} ${focusRing}`}
                onClick={() => onOpen(item)}
                onContextMenu={(e) => onContextMenu(e, item)}
                {...dragProps(dnd, item)}
                {...keyboardProps(item, onOpen, () =>
                  onSelect(isSelected ? selectedIds.filter((id) => id !== item.id) : [...selectedIds, item.id]),
                )}
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      onSelect(
                        isSelected
                          ? selectedIds.filter((id) => id !== item.id)
                          : [...selectedIds, item.id],
                      )
                    }}
                    className={`h-4 w-4 rounded border-border accent-primary cursor-pointer transition-opacity ${
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 touch:invisible group-data-[selecting=true]/sel:visible group-data-[selecting=true]/sel:opacity-100'
                    }`}
                    aria-label={`Select ${item.title}`}
                  />
                </td>

                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <IconLink item={item} className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {isFolder ? (
                        <FolderGlyph icon={item.icon} color={folderColor} size="sm" />
                      ) : item.icon?.startsWith('http') ? (
                        <img
                          src={item.icon}
                          alt=""
                          className="h-4 w-4"
                          onError={(e) => {
                            e.target.src = defaultLinkIcon
                          }}
                        />
                      ) : item.icon ? (
                        <span className="text-sm">{item.icon}</span>
                      ) : (
                        <Globe className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </IconLink>
                    <span className="truncate font-medium">{item.title}</span>
                  </div>
                </td>

                <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">
                  {item.url ? (
                    <a
                      href={linkHref(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex max-w-full items-center gap-1 truncate hover:text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{extractDomain(item.url)}</span>
                    </a>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>

                <td className="hidden whitespace-nowrap px-3 py-2 text-muted-foreground sm:table-cell">
                  {formatDate(item.updatedAt)}
                </td>

                <td className="hidden whitespace-nowrap px-3 py-2 text-muted-foreground xl:table-cell">
                  {formatDate(item.createdAt)}
                </td>

                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      className={`rounded-full p-1.5 transition-all ${
                        item.isFavorite
                          ? 'text-yellow-400'
                          : 'text-muted-foreground/40 opacity-0 hover:text-yellow-400 group-hover:opacity-100 touch:hidden'
                      } hover:bg-muted`}
                      onClick={() => onFavorite(item.id)}
                      aria-label={item.isFavorite ? 'Remove favorite' : 'Add favorite'}
                    >
                      <Star className="h-3.5 w-3.5" fill={item.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      className="rounded-full p-1.5 text-muted-foreground/60 opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100 touch:opacity-100"
                      onClick={(e) => onContextMenu(e, item)}
                      aria-label="Open menu"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Drive-style dates: recent items read as "Today"/"Yesterday", older ones show
// the date, and anything from a prior year includes it.
function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDiff = Math.round((startOfToday - startOfDate) / 86400000)

  if (dayDiff === 0) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  if (dayDiff === 1) return 'Yesterday'
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function extractDomain(url) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
