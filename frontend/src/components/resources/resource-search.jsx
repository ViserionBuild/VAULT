import { useEffect, useRef, useState } from 'react'
import { Search, X, Folder, Globe, CornerDownLeft } from 'lucide-react'
import defaultLinkIcon from '../../assets/default_link_icon.png'

/**
 * Drive-style single search box: one field that searches names, URLs, and
 * descriptions across the whole workspace, with a results dropdown.
 */
export function ResourceSearch({
  onSearch,
  onOpenResult,
  placeholder = 'Search in Resources',
  className = '',
}) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlighted, setHighlighted] = useState(0)

  const containerRef = useRef(null)
  const inputRef = useRef(null)
  // Guards against a slow early request overwriting a newer one's results.
  const requestIdRef = useRef(0)

  const query = term.trim()

  useEffect(() => {
    if (!query) {
      // Invalidate any in-flight request so its result cannot land later.
      requestIdRef.current += 1
      return
    }

    const requestId = ++requestIdRef.current

    // Debounced so typing does not fire a request per keystroke.
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const found = await onSearch(query)
        if (requestId !== requestIdRef.current) return
        setResults(found)
        setHighlighted(0)
        setOpen(true)
      } catch {
        if (requestId === requestIdRef.current) setResults([])
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query, onSearch])

  // Close when focus moves outside the search box.
  useEffect(() => {
    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  // "/" focuses search, the way Drive and GitHub do.
  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = document.activeElement?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable
      if (event.key === '/' && !typing) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const clear = () => {
    setTerm('')
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  const choose = (item) => {
    setOpen(false)
    onOpenResult(item)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      if (term) clear()
      else inputRef.current?.blur()
      return
    }
    if (!open || results.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted((i) => (i + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((i) => (i - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const chosen = results[highlighted]
      if (chosen) choose(chosen)
    }
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => query !== '' && results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search resources"
          className="h-11 w-full rounded-full border border-transparent bg-muted/60 pl-10 pr-10 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-border focus:bg-background focus:shadow-md"
        />
        {term ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {open && query !== '' && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-xl border border-border bg-background p-1 shadow-xl">
          {loading && results.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">Searching…</p>
          )}

          {!loading && results.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              No results for “{query}”
            </p>
          )}

          {results.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => choose(item)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                index === highlighted ? 'bg-muted' : ''
              }`}
            >
              <ResultIcon item={item} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.path}
                  {item.url ? ` · ${item.url}` : ''}
                </span>
              </span>
              {index === highlighted && (
                <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ResultIcon({ item }) {
  const color = item.color || item.metadata?.color

  if (item.type === 'folder') {
    return item.icon ? (
      <span className="text-base" style={color ? { color } : {}}>{item.icon}</span>
    ) : (
      <Folder className="h-4 w-4 shrink-0 text-primary/70" style={color ? { color } : {}} />
    )
  }

  if (item.icon?.startsWith('http')) {
    return (
      <img
        src={item.icon}
        alt=""
        className="h-4 w-4 shrink-0"
        onError={(e) => {
          e.target.src = defaultLinkIcon
        }}
      />
    )
  }

  if (item.icon) return <span className="text-sm">{item.icon}</span>
  return <Globe className="h-4 w-4 shrink-0 text-muted-foreground/50" />
}
