import { useState } from 'react'

const DEFAULT_SORT = { sortBy: 'position', sortOrder: 'asc' }

/** Sort field and direction, remembered in localStorage under `storageKey`. */
export function usePersistentSort(storageKey, defaultSort = DEFAULT_SORT) {
  const [sort, setSort] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey))
      if (saved?.sortBy && saved?.sortOrder) return saved
    } catch {
      // Fall through to the default.
    }
    return defaultSort
  })

  const changeSort = (sortBy, sortOrder) => {
    const next = { sortBy, sortOrder }
    setSort(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // Not persisted; still applies for this visit.
    }
  }

  // List/table header click: toggle direction on the active column.
  const toggleColumn = (field) =>
    changeSort(field, sort.sortBy === field && sort.sortOrder === 'asc' ? 'desc' : 'asc')

  return { ...sort, changeSort, toggleColumn }
}
