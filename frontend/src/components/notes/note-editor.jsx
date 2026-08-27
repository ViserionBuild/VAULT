import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Heading1, Heading2, Quote, Code, Link2, Highlighter,
  Undo2, Redo2, RemoveFormatting, CheckSquare, Palette,
} from 'lucide-react'
import { sanitizeNoteHtml } from '../../lib/note-html'

const TEXT_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#111827']
const HIGHLIGHTS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#e9d5ff']

/**
 * OneNote-style rich text editor.
 *
 * Runs in-document (not an iframe) so the toolbar, autosave and selection can
 * share state directly. Content is uncontrolled: React sets innerHTML once on
 * mount, then the DOM owns it. Re-rendering into a contenteditable on every
 * keystroke would destroy the caret position.
 */
export function NoteEditor({ initialContent, onDirtyChange, editorRef }) {
  const localRef = useRef(null)
  const ref = editorRef ?? localRef
  const [activeMarks, setActiveMarks] = useState({})
  const [palette, setPalette] = useState(null)

  // Seed once. `initialContent` changing means a different note was opened,
  // which remounts via `key` upstream rather than re-seeding here.
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = sanitizeNoteHtml(initialContent)
    // Emit <span style="..."> rather than <font color="...">, which is the
    // legacy default and gets stripped by the content whitelist.
    try {
      document.execCommand('styleWithCSS', false, true)
    } catch {
      // Not supported everywhere; the server converts <font> as a fallback.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshMarks = useCallback(() => {
    if (typeof document.queryCommandState !== 'function') return
    const read = (cmd) => {
      try {
        return document.queryCommandState(cmd)
      } catch {
        return false
      }
    }
    setActiveMarks({
      bold: read('bold'),
      italic: read('italic'),
      underline: read('underline'),
      strikeThrough: read('strikeThrough'),
      insertUnorderedList: read('insertUnorderedList'),
      insertOrderedList: read('insertOrderedList'),
    })
  }, [])

  const exec = (command, value = null) => {
    ref.current?.focus()
    document.execCommand(command, false, value)
    refreshMarks()
    onDirtyChange?.()
  }

  const applyBlock = (tag) => exec('formatBlock', tag)

  const insertChecklistItem = () => {
    // A simple checkbox line; `contenteditable=false` keeps the box itself
    // from being edited as text.
    exec(
      'insertHTML',
      '<div><span contenteditable="false"><input type="checkbox" /></span>&nbsp;</div>',
    )
  }

  const addLink = () => {
    const url = window.prompt('Link URL')
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      window.alert('Links must start with http:// or https://')
      return
    }
    exec('createLink', url)
  }

  useEffect(() => {
    const handler = () => refreshMarks()
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [refreshMarks])

  // Close the colour popovers on an outside click.
  useEffect(() => {
    if (!palette) return
    const close = (event) => {
      if (!event.target.closest?.('[data-palette]')) setPalette(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [palette])

  const handleKeyDown = (event) => {
    const mod = event.metaKey || event.ctrlKey
    if (!mod) return
    const key = event.key.toLowerCase()
    if (key === 'b') { event.preventDefault(); exec('bold') }
    else if (key === 'i') { event.preventDefault(); exec('italic') }
    else if (key === 'u') { event.preventDefault(); exec('underline') }
  }

  // Paste as sanitized HTML so copied styling neither breaks the note nor
  // smuggles markup past the whitelist.
  const handlePaste = (event) => {
    const html = event.clipboardData?.getData('text/html')
    if (!html) return
    event.preventDefault()
    document.execCommand('insertHTML', false, sanitizeNoteHtml(html))
    onDirtyChange?.()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
        <ToolButton icon={Undo2} label="Undo" onClick={() => exec('undo')} />
        <ToolButton icon={Redo2} label="Redo" onClick={() => exec('redo')} />
        <Divider />
        <ToolButton icon={Bold} label="Bold" active={activeMarks.bold} onClick={() => exec('bold')} />
        <ToolButton icon={Italic} label="Italic" active={activeMarks.italic} onClick={() => exec('italic')} />
        <ToolButton icon={Underline} label="Underline" active={activeMarks.underline} onClick={() => exec('underline')} />
        <ToolButton icon={Strikethrough} label="Strikethrough" active={activeMarks.strikeThrough} onClick={() => exec('strikeThrough')} />
        <Divider />

        <div className="relative" data-palette>
          <ToolButton icon={Palette} label="Text colour" onClick={() => setPalette((p) => (p === 'text' ? null : 'text'))} />
          {palette === 'text' && (
            <Swatches
              colors={TEXT_COLORS}
              onPick={(c) => { exec('foreColor', c); setPalette(null) }}
            />
          )}
        </div>
        <div className="relative" data-palette>
          <ToolButton icon={Highlighter} label="Highlight" onClick={() => setPalette((p) => (p === 'mark' ? null : 'mark'))} />
          {palette === 'mark' && (
            <Swatches
              colors={HIGHLIGHTS}
              onPick={(c) => { exec('hiliteColor', c); setPalette(null) }}
            />
          )}
        </div>

        <Divider />
        <ToolButton icon={Heading1} label="Heading 1" onClick={() => applyBlock('H1')} />
        <ToolButton icon={Heading2} label="Heading 2" onClick={() => applyBlock('H2')} />
        <ToolButton icon={List} label="Bullet list" active={activeMarks.insertUnorderedList} onClick={() => exec('insertUnorderedList')} />
        <ToolButton icon={ListOrdered} label="Numbered list" active={activeMarks.insertOrderedList} onClick={() => exec('insertOrderedList')} />
        <ToolButton icon={CheckSquare} label="Checklist" onClick={insertChecklistItem} />
        <Divider />
        <ToolButton icon={Quote} label="Quote" onClick={() => applyBlock('BLOCKQUOTE')} />
        <ToolButton icon={Code} label="Code block" onClick={() => applyBlock('PRE')} />
        <ToolButton icon={Link2} label="Insert link" onClick={addLink} />
        <ToolButton icon={RemoveFormatting} label="Clear formatting" onClick={() => exec('removeFormat')} />
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Note content"
        spellCheck
        onInput={() => onDirtyChange?.()}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onMouseUp={refreshMarks}
        onKeyUp={refreshMarks}
        className="note-content min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm outline-none"
      />
    </div>
  )
}

function ToolButton({ icon: Icon, label, onClick, active }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={Boolean(active)}
      // onMouseDown-preventDefault keeps the selection alive when the button
      // is clicked; otherwise the caret is lost before the command runs.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded p-1.5 transition-colors ${
        active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

function Swatches({ colors, onPick }) {
  return (
    <div className="absolute left-0 top-full z-50 mt-1 flex gap-1 rounded-lg border border-border bg-background p-1.5 shadow-xl">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(color)}
          aria-label={`Colour ${color}`}
          className="h-5 w-5 rounded border border-border/60 transition-transform hover:scale-110"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
}
