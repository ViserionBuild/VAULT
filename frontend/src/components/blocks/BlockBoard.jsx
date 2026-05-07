import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { useWorkspaceStore } from '../../store/workspaceStore'

function SortableCard({ block, onToggleFavorite }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <motion.article
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
      {...attributes}
      {...listeners}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="truncate font-medium">{block.title}</h3>
        <button className="text-yellow-400" onClick={() => onToggleFavorite(block.id)}>
          {block.isFavorite ? '★' : '☆'}
        </button>
      </div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{block.type}</p>
      {block.type === 'url' && block.url ? (
        <a
          href={block.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block truncate text-sm text-violet-300 hover:text-violet-200"
        >
          {block.url}
        </a>
      ) : null}
      {block.content ? <p className="mt-2 text-sm text-slate-300">{block.content}</p> : null}
    </motion.article>
  )
}

function BlockBoard() {
  const { blocks, reorderBlocks, toggleFavoriteBlock, query } = useWorkspaceStore()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const visibleBlocks = blocks.filter((block) => {
    const q = query.toLowerCase()
    if (!q) return !block.deletedAt
    return !block.deletedAt && [block.title, block.type, block.content, block.url].join(' ').toLowerCase().includes(q)
  })

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return
        const oldIndex = visibleBlocks.findIndex((item) => item.id === active.id)
        const newIndex = visibleBlocks.findIndex((item) => item.id === over.id)
        const newOrder = arrayMove(visibleBlocks, oldIndex, newIndex)
        reorderBlocks(newOrder.map((item) => item.id))
      }}
    >
      <SortableContext items={visibleBlocks.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleBlocks.map((block) => (
            <SortableCard key={block.id} block={block} onToggleFavorite={toggleFavoriteBlock} />
          ))}
          {visibleBlocks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
              No blocks found.
            </div>
          ) : null}
        </div>
      </SortableContext>
    </DndContext>
  )
}

export default BlockBoard
