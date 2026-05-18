import { Trash2, FolderInput, X, Tag } from 'lucide-react'
import { Button } from '../ui/button'

export function BulkActionBar({ count, onDelete, onMove, onTag, onClear }) {
  if (count === 0) return null

  return (
    <div className="sticky bottom-4 z-30 mx-auto flex w-fit items-center gap-2 rounded-xl border border-border bg-background/95 px-4 py-2.5 shadow-2xl backdrop-blur animate-in slide-in-from-bottom-4">
      <span className="text-sm font-medium text-primary">
        {count} selected
      </span>
      <div className="h-4 w-px bg-border" />
      <Button variant="ghost" size="sm" onClick={onMove} title="Move">
        <FolderInput className="mr-1.5 h-4 w-4" /> Move
      </Button>
      <Button variant="ghost" size="sm" onClick={onTag} title="Tag">
        <Tag className="mr-1.5 h-4 w-4" /> Tag
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-400" title="Delete">
        <Trash2 className="mr-1.5 h-4 w-4" /> Delete
      </Button>
      <div className="h-4 w-px bg-border" />
      <Button variant="ghost" size="sm" onClick={onClear}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
