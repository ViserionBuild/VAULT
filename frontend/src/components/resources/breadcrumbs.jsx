import { ChevronRight, Home } from 'lucide-react'

export function Breadcrumbs({ breadcrumbs, onNavigate }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto pb-1">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground transition-colors shrink-0"
      >
        <Home className="h-3.5 w-3.5" />
        <span>Root</span>
      </button>
      {breadcrumbs.map((crumb, idx) => (
        <span key={crumb.id} className="flex items-center gap-1 shrink-0">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <button
            onClick={() => onNavigate(crumb.id)}
            className={`rounded-md px-2 py-1 transition-colors ${
              idx === breadcrumbs.length - 1
                ? 'font-medium text-foreground'
                : 'hover:bg-muted hover:text-foreground'
            }`}
          >
            {crumb.title}
          </button>
        </span>
      ))}
    </nav>
  )
}
