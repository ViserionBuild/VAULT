import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Check, Loader2, AlertCircle, Pencil, Eye } from 'lucide-react'
import { NoteEditor } from './note-editor'
import { useAutosave } from '../../hooks/use-autosave'
import { sanitizeNoteHtml } from '../../lib/note-html'
import { Button } from '../ui/button'

/**
 * Note editor with continuous autosave.
 *
 * Rendered in normal page flow rather than as a fixed overlay, so it occupies
 * the content column and leaves the sidebar visible and usable. A fixed
 * element cannot know the sidebar's runtime width, which is toggleable.
 *
 * Read and edit are the same surface — toggling does not reload from the
 * server, so the view never flickers or reverts while a save is in flight.
 */
export function NoteEditorDialog({ note, mode = 'edit', onClose, onSave, onSaved }) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [editing, setEditing] = useState(mode === 'edit')
  // Content shown in read mode; kept in sync from the editor DOM so switching
  // modes never loses in-progress edits.
  const [content, setContent] = useState(note?.content ?? '')
  const editorRef = useRef(null)
  const titleRef = useRef(note?.title ?? '')

  const readCurrent = useCallback(
    () => ({
      title: titleRef.current.trim() || 'Untitled note',
      content: editorRef.current ? editorRef.current.innerHTML : content,
    }),
    [content],
  )

  const { status, lastSavedAt, schedule, flush, markClean } = useAutosave({
    onSave: async (payload) => {
      const saved = await onSave(payload)
      onSaved?.(saved)
    },
  })

  // Adopt the server copy as the baseline so opening a note does not
  // immediately write it back unchanged.
  useEffect(() => {
    markClean({ title: note?.title ?? '', content: note?.content ?? '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id])

  const handleDirty = useCallback(() => {
    const current = readCurrent()
    setContent(current.content)
    schedule(current)
  }, [readCurrent, schedule])

  const handleTitleChange = (value) => {
    titleRef.current = value
    setTitle(value)
    schedule(readCurrent())
  }

  const closeWithSave = useCallback(async () => {
    // A new note closed without typing anything isn't saved. (Its title
    // falls back to "Untitled note", so it would otherwise look edited.)
    const editor = editorRef.current
    const untouched =
      !note?.id &&
      !titleRef.current.trim() &&
      !editor?.textContent.trim() &&
      !editor?.querySelector('img, hr, table, input')
    // Never drop a pending edit on the way out.
    if (!untouched) await flush(readCurrent())
    onClose()
  }, [flush, readCurrent, onClose, note?.id])

  // Ctrl/Cmd+S saves now; Escape closes (saving first).
  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void flush(readCurrent())
      } else if (event.key === 'Escape') {
        void closeWithSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flush, readCurrent, closeWithSave])

  // Last-chance save if the tab is closed mid-edit.
  useEffect(() => {
    const onHide = () => {
      if (status === 'unsaved') void flush(readCurrent())
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
    }
  }, [status, flush, readCurrent])

  // Phones: fit between the app bar and tab bar (dvh tracks the browser UI).
  return (
    <div className="flex h-[calc(100dvh-9.5rem-env(safe-area-inset-bottom))] min-h-[20rem] flex-col md:h-[calc(100vh-8rem)] md:min-h-[24rem] overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled note"
          aria-label="Note title"
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground"
        />

        <SaveStatus status={status} lastSavedAt={lastSavedAt} />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing((v) => !v)}
          title={editing ? 'Reading view' : 'Edit note'}
        >
          {editing ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </Button>

        <Button size="sm" variant="ghost" onClick={closeWithSave} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {editing ? (
        <NoteEditor
          key={note?.id ?? 'new'}
          initialContent={note?.content ?? ''}
          editorRef={editorRef}
          onDirtyChange={handleDirty}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div
            className="note-content mx-auto max-w-3xl text-sm"
            dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(content) }}
          />
        </div>
      )}
    </div>
  )
}

function SaveStatus({ status, lastSavedAt }) {
  const time = lastSavedAt
    ? lastSavedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : null

  const map = {
    saving: { icon: Loader2, text: 'Saving…', className: 'text-muted-foreground', spin: true },
    saved: { icon: Check, text: time ? `Saved ${time}` : 'Saved', className: 'text-green-600 dark:text-green-400' },
    unsaved: { icon: Pencil, text: 'Editing…', className: 'text-muted-foreground' },
    error: { icon: AlertCircle, text: 'Save failed — retrying on next edit', className: 'text-red-500' },
  }

  const state = map[status]
  if (!state) return null
  const Icon = state.icon

  return (
    <span className={`hidden items-center gap-1.5 whitespace-nowrap text-xs sm:flex ${state.className}`}>
      <Icon className={`h-3.5 w-3.5 ${state.spin ? 'animate-spin' : ''}`} />
      {state.text}
    </span>
  )
}
