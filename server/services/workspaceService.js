const folders = []
const blocks = []

const nowIso = () => new Date().toISOString()

export function listFolders(userId) {
  return folders.filter((f) => f.user_id === userId)
}

export function createFolder(userId, payload) {
  const folder = {
    id: crypto.randomUUID(),
    user_id: userId,
    parent_id: payload.parent_id || null,
    name: payload.name || 'Untitled Folder',
    icon: payload.icon || '📁',
    color: payload.color || null,
    is_favorite: false,
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  }
  folders.push(folder)
  return folder
}

export function updateFolder(userId, id, patch) {
  const folder = folders.find((item) => item.id === id && item.user_id === userId)
  if (!folder) return null
  Object.assign(folder, patch, { updated_at: nowIso() })
  return folder
}

export function listBlocks(userId) {
  return blocks.filter((b) => b.user_id === userId)
}

export function createBlock(userId, payload) {
  const block = {
    id: crypto.randomUUID(),
    user_id: userId,
    folder_id: payload.folder_id || null,
    title: payload.title || 'Untitled Block',
    type: payload.type || 'note',
    url: payload.url || null,
    content: payload.content || null,
    icon: payload.icon || '🧩',
    color: payload.color || null,
    metadata: payload.metadata || {},
    is_favorite: false,
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  }
  blocks.push(block)
  return block
}

export function updateBlock(userId, id, patch) {
  const block = blocks.find((item) => item.id === id && item.user_id === userId)
  if (!block) return null
  Object.assign(block, patch, { updated_at: nowIso() })
  return block
}

export function searchWorkspace(userId, q = '') {
  const query = q.toLowerCase()
  const userFolders = listFolders(userId).filter((f) => `${f.name}`.toLowerCase().includes(query))
  const userBlocks = listBlocks(userId).filter((b) =>
    [b.title, b.type, b.content, b.url].join(' ').toLowerCase().includes(query),
  )
  return { folders: userFolders, blocks: userBlocks }
}

export function listFavorites(userId) {
  return {
    folders: listFolders(userId).filter((item) => item.is_favorite && !item.deleted_at),
    blocks: listBlocks(userId).filter((item) => item.is_favorite && !item.deleted_at),
  }
}

export function listTrash(userId) {
  return {
    folders: listFolders(userId).filter((item) => item.deleted_at),
    blocks: listBlocks(userId).filter((item) => item.deleted_at),
  }
}
