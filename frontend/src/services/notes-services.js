export function fetchNotes(api, { workspaceId, sortBy, sortOrder, parentId }) {
  const params = new URLSearchParams({
    workspaceId,
    sortBy,
    sortOrder,
  })
  if (parentId) params.set('parentId', parentId)
  return api(`/notes?${params}`)
}

export function fetchNote(api, noteId) {
  return api(`/notes/${noteId}`)
}

export function createNote(api, payload) {
  return api('/notes', { method: 'POST', body: payload })
}

export function updateNote(api, noteId, updates) {
  return api(`/notes/${noteId}`, { method: 'PUT', body: updates })
}

export function deleteNote(api, noteId) {
  return api(`/notes/${noteId}`, { method: 'DELETE' })
}

export function favoriteNote(api, noteId) {
  return api(`/notes/${noteId}/favorite`, { method: 'POST' })
}

export function moveNote(api, noteId, parentId) {
  return api(`/notes/${noteId}/move`, {
    method: 'POST',
    body: { parentId },
  })
}
