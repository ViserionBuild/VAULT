import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Globe, Pencil, Plus, RefreshCw, Tag, Trash2, X } from 'lucide-react'
import { useApi } from '../hooks/use-api'
import { useWorkspace } from '../contexts/workspace-context'
import { Button } from '../components/ui/button'
import { Dialog } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { useToast } from '../components/ui/toast'
import { TAG_COLORS, TagChip } from '../components/tags/tag-chip'
import { useTags } from '../components/tags/use-tags'
import { FolderGlyph } from '../components/resources/folder-appearance'
import defaultLinkIcon from '../assets/default_link_icon.png'

export function TagsPage() {
  const api = useApi()
  const toast = useToast()
  const navigate = useNavigate()
  const { activeWorkspace } = useWorkspace()
  const { tags, setTags, loaded, refresh, createTag } = useTags()

  // The selected tag lives in the URL so it survives refresh and Back.
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('tag')
  const selectedTag = tags.find((tag) => tag.id === selectedId) ?? null

  const [tagged, setTagged] = useState({ tagId: null, items: [], loading: false })
  const [editor, setEditor] = useState(null) // { mode: 'create' } | { mode: 'edit', tag }
  const [editorKey, setEditorKey] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const openEditor = (value) => {
    setEditorKey((k) => k + 1)
    setEditor(value)
  }

  const loadItems = useCallback(
    async (tagId) => {
      if (!tagId || !activeWorkspace) return
      setTagged((prev) => ({ ...prev, tagId, loading: true }))
      try {
        const data = await api(`/tags/${tagId}/items?workspaceId=${activeWorkspace.id}`)
        setTagged({ tagId, items: data.items ?? [], loading: false })
      } catch {
        setTagged({ tagId, items: [], loading: false })
        toast.error("Couldn't load the items for this tag.")
      }
    },
    [api, activeWorkspace, toast],
  )

  useEffect(() => {
    queueMicrotask(() => {
      void loadItems(selectedId)
    })
  }, [selectedId, loadItems])

  const selectTag = (tagId) => setSearchParams(tagId ? { tag: tagId } : {})

  const saveTag = async ({ name, color }) => {
    if (editor.mode === 'create') {
      const tag = await createTag(name, color)
      selectTag(tag.id)
      return
    }
    const updated = await api(`/tags/${editor.tag.id}`, { method: 'PUT', body: { name, color } })
    setTags((prev) =>
      prev
        .map((tag) => (tag.id === updated.id ? { ...tag, ...updated } : tag))
        .sort((a, b) => a.name.localeCompare(b.name)),
    )
  }

  const deleteTag = async (tag) => {
    setConfirmDelete(null)
    setTags((prev) => prev.filter((t) => t.id !== tag.id))
    if (selectedId === tag.id) selectTag(null)
    try {
      await api(`/tags/${tag.id}`, { method: 'DELETE' })
      toast.show({ message: `Deleted tag “${tag.name}”` })
    } catch {
      toast.error('Could not delete the tag. Please try again.')
      refresh()
    }
  }

  const removeFromItem = async (item) => {
    setTagged((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== item.id) }))
    setTags((prev) => prev.map((t) => (t.id === selectedId ? { ...t, itemCount: Math.max(0, t.itemCount - 1) } : t)))
    try {
      await api(`/items/${item.id}/tags/${selectedId}`, { method: 'DELETE' })
    } catch {
      toast.error('Could not remove the tag. Please try again.')
      loadItems(selectedId)
      refresh()
    }
  }

  const openItem = (item) => {
    if (item.type === 'folder') navigate(`/resources?folder=${item.id}`)
    else if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tags</h1>
          <p className="text-sm text-muted-foreground">
            Label resources across folders, then find them all here.
          </p>
        </div>
        <Button size="sm" onClick={() => openEditor({ mode: 'create' })}>
          <Plus className="mr-1.5 h-4 w-4" /> New tag
        </Button>
      </div>

      {!loaded && (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {loaded && tags.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-2xl bg-muted/50 p-6">
            <Tag className="h-12 w-12 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-semibold">No tags yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create a tag here, or choose “Tags…” on any resource to label it.
          </p>
          <Button className="mt-4" onClick={() => openEditor({ mode: 'create' })}>
            <Plus className="mr-1.5 h-4 w-4" /> New tag
          </Button>
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2" role="list" aria-label="Tags">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              role="listitem"
              onClick={() => selectTag(selectedId === tag.id ? null : tag.id)}
              aria-pressed={selectedId === tag.id}
              className={`flex items-center gap-1.5 rounded-full p-0.5 pr-2.5 transition-all ${
                selectedId === tag.id ? 'ring-2 ring-primary' : 'hover:bg-muted'
              }`}
            >
              <TagChip tag={tag} />
              <span className="text-xs text-muted-foreground">{tag.itemCount}</span>
            </button>
          ))}
        </div>
      )}

      {selectedTag && (
        <div className="rounded-xl border border-border">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <TagChip tag={selectedTag} />
            <span className="text-sm text-muted-foreground">
              {tagged.loading ? 'Loading…' : `${tagged.items.length} item${tagged.items.length === 1 ? '' : 's'} in ${activeWorkspace?.name ?? 'this workspace'}`}
            </span>
            <div className="ml-auto flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => openEditor({ mode: 'edit', tag: selectedTag })}>
                <Pencil className="mr-1.5 h-4 w-4" /> Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-400"
                onClick={() => setConfirmDelete(selectedTag)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
            </div>
          </div>

          {!tagged.loading && tagged.items.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing has this tag yet. Choose “Tags…” on a resource to add it.
            </p>
          )}

          <ul>
            {tagged.items.map((item) => (
              <li
                key={item.id}
                className="group flex items-center gap-3 border-b border-border/50 px-4 py-2.5 last:border-b-0 hover:bg-muted/50"
              >
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {item.type === 'folder' ? (
                      <FolderGlyph icon={item.icon} color={item.color || item.metadata?.color} size="sm" />
                    ) : item.icon?.startsWith('http') ? (
                      <img
                        src={item.icon}
                        alt=""
                        className="h-4 w-4"
                        onError={(e) => {
                          e.currentTarget.src = defaultLinkIcon
                        }}
                      />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground/60" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.path}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => removeFromItem(item)}
                  aria-label={`Remove “${selectedTag.name}” from ${item.title}`}
                  title="Remove tag"
                  className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 touch:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editor && (
        <TagEditorDialog
          key={editorKey}
          mode={editor.mode}
          tag={editor.tag}
          defaultColor={TAG_COLORS[tags.length % TAG_COLORS.length]}
          onClose={() => setEditor(null)}
          onSave={saveTag}
        />
      )}

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title="Delete tag?">
        <p className="text-sm text-muted-foreground">
          “{confirmDelete?.name}” will be removed from {confirmDelete?.itemCount ?? 0} item
          {confirmDelete?.itemCount === 1 ? '' : 's'}. The items themselves are kept.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button className="bg-red-600 hover:bg-red-500" onClick={() => deleteTag(confirmDelete)}>
            Delete tag
          </Button>
        </div>
      </Dialog>
    </section>
  )
}

function TagEditorDialog({ mode, tag, defaultColor, onClose, onSave }) {
  const [name, setName] = useState(tag?.name ?? '')
  const [color, setColor] = useState(tag?.color ?? defaultColor)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), color })
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save the tag.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} title={mode === 'create' ? 'New tag' : 'Edit tag'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="tag-name" className="mb-1.5 block text-sm font-medium">
            Name
          </label>
          <Input id="tag-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Read later" autoFocus required />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium">Color</span>
          <div className="flex flex-wrap gap-2">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
                className={`h-8 w-8 rounded-full transition-all ${
                  color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium">Preview</span>
          <TagChip tag={{ name: name.trim() || 'Tag name', color }} />
        </div>
        {error && (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : mode === 'create' ? 'Create tag' : 'Save'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
