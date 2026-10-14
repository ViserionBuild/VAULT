import { LayoutGrid, List, StretchHorizontal, GalleryVerticalEnd } from 'lucide-react'
import { Button } from '../ui/button'

const views = [
  { key: 'grid', icon: LayoutGrid, label: 'Grid' },
  { key: 'cards', icon: GalleryVerticalEnd, label: 'Cards' },
  { key: 'list', icon: List, label: 'List' },
  { key: 'table', icon: StretchHorizontal, label: 'Table' },
]

// `views` limits which views are offered (keys from the list above).
export function ViewToggle({ activeView, onViewChange, views: allowed }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
      {views.filter((v) => !allowed || allowed.includes(v.key)).map(({ key, icon: Icon, label }) => (
        <Button
          key={key}
          variant={activeView === key ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange(key)}
          title={label}
          className="h-8 w-8 p-0"
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  )
}
