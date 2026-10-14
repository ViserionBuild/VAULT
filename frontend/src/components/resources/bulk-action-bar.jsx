import { Trash2, FolderInput, X, Tag } from 'lucide-react'
import { Button } from '../ui/button'

export function BulkActionBar({ count, onDelete, onMove, onTag, onClear }) {
  if (count === 0) return null

  return (
    <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto flex w-fit max-w-full items-center gap-1 rounded-xl border border-border bg-background/95 px-2 py-2 shadow-2xl backdrop-blur animate-in slide-in-from-bottom-4 sm:gap-2 sm:px-4 sm:py-2.5 md:bottom-4">
      <span className="text-sm font-medium text-primary">
        {count} selected
      </span>
      <div className="h-4 w-px bg-border" />
      <Button variant="ghost" size="sm" onClick={onMove} title="Move">
        <FolderInput className="h-4 w-4 xs:mr-1.5" /> <span className="hidden xs:inline">Move</span>
      </Button>
      {/* Only offered where tagging is implemented. */}
      {onTag && (
        <Button variant="ghost" size="sm" onClick={onTag} title="Tag">
          <Tag className="h-4 w-4 xs:mr-1.5" /> <span className="hidden xs:inline">Tag</span>
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-400" title="Delete">
        <Trash2 className="h-4 w-4 xs:mr-1.5" /> <span className="hidden xs:inline">Delete</span>
      </Button>
      <div className="h-4 w-px bg-border" />
      <Button variant="ghost" size="sm" onClick={onClear}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
