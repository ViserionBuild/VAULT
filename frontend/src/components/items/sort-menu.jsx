import { ArrowDownNarrowWide, ArrowUpNarrowWide } from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'position', label: 'Default order' },
  { value: 'title', label: 'Name' },
  { value: 'updatedAt', label: 'Last modified' },
  { value: 'createdAt', label: 'Date created' },
]

/**
 * Sort control for every view (the list and table headers sort too, but the
 * grid has no headers). A native select, so phones show their own picker.
 */
export function SortMenu({ sortBy, sortOrder, onChange, options = SORT_OPTIONS }) {
  const ascending = sortOrder === 'asc'
  const DirectionIcon = ascending ? ArrowUpNarrowWide : ArrowDownNarrowWide

  return (
    <div className="flex h-9 items-center rounded-lg border border-border bg-muted/40">
      <select
        value={sortBy}
        onChange={(e) => onChange(e.target.value, sortOrder)}
        aria-label="Sort by"
        className="h-full cursor-pointer rounded-l-lg bg-transparent pl-2.5 pr-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onChange(sortBy, ascending ? 'desc' : 'asc')}
        aria-label={ascending ? 'Ascending; switch to descending' : 'Descending; switch to ascending'}
        title={ascending ? 'Ascending' : 'Descending'}
        className="flex h-full items-center rounded-r-lg border-l border-border px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <DirectionIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
