const crypto = require('node:crypto')
const { createSupabaseClient } = require('./supabase')

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60

function mapUserRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  }
}

function mapWorkspaceRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    userId: row.user_id,
    icon: row.icon,
    color: row.color,
    isDefault: row.is_default,
    createdAt: row.created_at,
  }
}

function mapFolderRow(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    type: 'folder',
    url: null,
    description: row.description ?? '',
    icon: row.icon,
    thumbnail: null,
    parentId: row.parent_id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    isFavorite: row.is_favorite,
    isDeleted: row.is_deleted,
    position: row.position,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  }
}

function mapFileRow(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    type: 'url',
    url: row.url,
    description: row.description ?? '',
    icon: row.icon,
    thumbnail: row.thumbnail,
    parentId: row.parent_id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    isFavorite: row.is_favorite,
    isDeleted: row.is_deleted,
    position: row.position,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  }
}

function mapItemRow(row, itemType) {
  if (!row) return null
  if (itemType === 'folder') return mapFolderRow(row)
  if (itemType === 'url') return mapFileRow(row)
  return row.url === null ? mapFolderRow(row) : mapFileRow(row)
}

function compareValues(left, right, ascending = true) {
  if (left === right) return 0
  if (left === undefined || left === null) return ascending ? 1 : -1
  if (right === undefined || right === null) return ascending ? -1 : 1
  if (left < right) return ascending ? -1 : 1
  return ascending ? 1 : -1
}

function applyParentFilter(query, parentId) {
  if (parentId === null || parentId === undefined || parentId === '') {
    return query.is('parent_id', null)
  }

  return query.eq('parent_id', String(parentId))
}

function mapTagRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    userId: row.user_id,
    createdAt: row.created_at,
  }
}

function mapNoteRow(row) {
  if (!row) return null
  return {
    id: row.id,
    type: 'note',
    title: row.title,
    content: row.content ?? '',
    parentId: row.parent_id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    isFavorite: row.is_favorite,
    isDeleted: row.is_deleted,
    position: row.position,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  }
}

function mapNoteFolderRow(row) {
  if (!row) return null
  return {
    id: row.id,
    type: 'folder',
    title: row.title,
    description: row.description ?? '',
    icon: row.icon,
    parentId: row.parent_id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    isFavorite: row.is_favorite,
    isDeleted: row.is_deleted,
    position: row.position,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  }
}

function mapTodoListRow(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? '',
    priority: row.priority ?? 0,
    targetDate: row.target_date ?? null,
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
    taskCount: row.taskCount ?? 0,
    completedTaskCount: row.completedTaskCount ?? 0,
    completed: row.completed ?? false,
    taskSearchText: row.taskSearchText ?? '',
  }
}

function mapTodoTaskRow(row) {
  if (!row) return null
  return {
    id: row.id,
    listId: row.list_id,
    title: row.title,
    description: row.description ?? '',
    completed: row.completed,
    priority: row.priority ?? 0,
    dueDate: row.due_date ?? null,
    orderIndex: row.order_index ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

class SupabaseStore {
  constructor(client) {
    this.client = client
  }

  // Users
  async createUser({ name, email, passwordHash }) {
    const normalizedEmail = email.trim().toLowerCase()
    const { data, error } = await this.client
      .from('users')
      .insert({ name, email: normalizedEmail, password_hash: passwordHash })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        return null
      }
      throw error
    }

    await this.createWorkspace({
      name: 'Personal',
      userId: data.id,
      icon: '🏠',
      color: '#7c3aed',
      isDefault: true,
    })

    return mapUserRow(data)
  }

  async findUserByEmail(email) {
    const normalizedEmail = email.trim().toLowerCase()
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .limit(1)

    if (error) throw error
    return mapUserRow(data?.[0])
  }

  async findUserById(id) {
    const { data, error } = await this.client.from('users').select('*').eq('id', id).limit(1)
    if (error) throw error
    return mapUserRow(data?.[0])
  }

  async listUsersRaw({ limit = 50 } = {}) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data ?? []
  }

  // Refresh tokens
  async storeRefreshToken({ userId, token }) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString()

    const { error } = await this.client.from('refresh_tokens').insert({
      token_hash: tokenHash,
      user_id: String(userId),
      revoked_at: null,
      expires_at: expiresAt,
    })

    if (error) throw error
  }

  async rotateRefreshToken({ oldToken, newToken, userId }) {
    await this.revokeRefreshToken(oldToken)
    await this.storeRefreshToken({ userId, token: newToken })
  }

  async findValidRefreshToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const nowIso = new Date().toISOString()

    const { data, error } = await this.client
      .from('refresh_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .gt('expires_at', nowIso)
      .limit(1)

    if (error) throw error
    return data?.[0] ?? null
  }

  async revokeRefreshToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const { error } = await this.client
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)

    if (error) throw error
  }

  // Workspaces
  async createWorkspace({ name, userId, icon, color, isDefault }) {
    const { data, error } = await this.client
      .from('workspaces')
      .insert({
        name,
        user_id: String(userId),
        icon: icon ?? 'folder',
        color: color ?? '#7c3aed',
        is_default: Boolean(isDefault),
      })
      .select('*')
      .single()

    if (error) throw error
    return mapWorkspaceRow(data)
  }

  async getWorkspaces(userId) {
    const { data, error } = await this.client
      .from('workspaces')
      .select('*')
      .eq('user_id', String(userId))

    if (error) throw error
    return (data ?? []).map(mapWorkspaceRow)
  }

  async getDefaultWorkspace(userId) {
    const { data, error } = await this.client
      .from('workspaces')
      .select('*')
      .eq('user_id', String(userId))
      .eq('is_default', true)
      .limit(1)

    if (error) throw error
    return mapWorkspaceRow(data?.[0])
  }

  async getWorkspaceById(workspaceId, userId) {
    const { data, error } = await this.client
      .from('workspaces')
      .select('*')
      .eq('id', String(workspaceId))
      .eq('user_id', String(userId))
      .limit(1)

    if (error) throw error
    return mapWorkspaceRow(data?.[0])
  }

  // Notes
  async _fetchNoteEntry(noteId, userId) {
    const { data, error } = await this.client
      .from('notes')
      .select('*')
      .eq('id', String(noteId))
      .eq('user_id', String(userId))
      .limit(1)

    if (error) throw error
    return data?.[0] ? mapNoteRow(data[0]) : null
  }

  async _countNoteSiblings({ parentId, userId, workspaceId }) {
    const query = applyParentFilter(
      this.client
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', String(userId))
        .eq('workspace_id', String(workspaceId))
        .eq('is_deleted', false),
      parentId,
    )

    const { count, error } = await query
    if (error) throw error
    return count ?? 0
  }

  async createNote({ title, type, content, parentId, userId, workspaceId, description, icon }) {
    const position = await this._countNoteSiblings({ parentId, userId, workspaceId })
    const nowIso = new Date().toISOString()

    if (type === 'folder') {
      const { data, error } = await this.client
        .from('notes_folders')
        .insert({
          title: title.trim(),
          description: description ?? '',
          icon: icon ?? null,
          parent_id: parentId ? String(parentId) : null,
          user_id: String(userId),
          workspace_id: String(workspaceId),
          is_favorite: false,
          is_deleted: false,
          position,
          metadata: {},
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select('*')
        .single()

      if (error) throw error
      return mapNoteFolderRow(data)
    }

    const { data, error } = await this.client
      .from('notes')
      .insert({
        title: title.trim(),
        content: content ?? '',
        parent_id: parentId ? String(parentId) : null,
        user_id: String(userId),
        workspace_id: String(workspaceId),
        is_favorite: false,
        is_deleted: false,
        position,
        metadata: {},
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single()

    if (error) throw error
    return mapNoteRow(data)
  }

  async getNoteById(noteId, userId) {
    return this._fetchNoteEntry(noteId, userId)
  }

  async getNotesByParent({ parentId, userId, workspaceId, sortBy, sortOrder }) {
    let query = applyParentFilter(
      this.client
        .from('notes')
        .select('*')
        .eq('user_id', String(userId))
        .eq('workspace_id', String(workspaceId))
        .eq('is_deleted', false),
      parentId,
    )

    const orderField =
      sortBy === 'title'
        ? 'title'
        : sortBy === 'createdAt'
          ? 'created_at'
          : sortBy === 'updatedAt'
            ? 'updated_at'
            : 'position'

    query = query.order(orderField, { ascending: sortOrder !== 'desc' })

    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map(mapNoteRow)
  }

  async getNotesFoldersByParent({ parentId, userId, workspaceId, sortBy, sortOrder }) {
    let query = applyParentFilter(
      this.client
        .from('notes_folders')
        .select('*')
        .eq('user_id', String(userId))
        .eq('workspace_id', String(workspaceId))
        .eq('is_deleted', false),
      parentId,
    )

    const orderField =
      sortBy === 'title'
        ? 'title'
        : sortBy === 'createdAt'
          ? 'created_at'
          : sortBy === 'updatedAt'
            ? 'updated_at'
            : 'position'

    query = query.order(orderField, { ascending: sortOrder !== 'desc' })

    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map(mapNoteFolderRow)
  }

  async updateNote(noteId, userId, updates) {
    const existing = await this._fetchNoteEntry(noteId, userId)
    if (!existing) return null

    const payload = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) payload.title = updates.title
    if (updates.content !== undefined) payload.content = updates.content

    const { data, error } = await this.client
      .from('notes')
      .update(payload)
      .eq('id', String(noteId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error
    return mapNoteRow(data)
  }

  async softDeleteNote(noteId, userId) {
    const existing = await this._fetchNoteEntry(noteId, userId)
    if (!existing) return null

    const nowIso = new Date().toISOString()
    const { data, error } = await this.client
      .from('notes')
      .update({ is_deleted: true, deleted_at: nowIso, updated_at: nowIso })
      .eq('id', String(noteId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error
    return mapNoteRow(data)
  }

  async restoreNote(noteId, userId) {
    const existing = await this._fetchNoteEntry(noteId, userId)
    if (!existing || !existing.isDeleted) return null

    let nextParentId = existing.parentId
    if (nextParentId) {
      const parent = await this._fetchNoteFolderEntry(nextParentId, userId)
      if (parent && parent.is_deleted) {
        nextParentId = null
      }
    }

    const { data, error } = await this.client
      .from('notes')
      .update({
        is_deleted: false,
        deleted_at: null,
        parent_id: nextParentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(noteId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error
    return mapNoteRow(data)
  }

  async purgeNote(noteId, userId) {
    const existing = await this._fetchNoteEntry(noteId, userId)
    if (!existing) return false

    const { error: tagError } = await this.client
      .from('item_tags')
      .delete()
      .eq('item_id', String(noteId))

    if (tagError) throw tagError

    const { error } = await this.client
      .from('notes')
      .delete()
      .eq('id', String(noteId))
      .eq('user_id', String(userId))

    if (error) throw error
    return true
  }

  async moveNote(noteId, userId, newParentId) {
    const existing = await this._fetchNoteEntry(noteId, userId)
    if (!existing) return null

    const targetParentId = newParentId ? String(newParentId) : null
    if (String(existing.parentId ?? null) === String(targetParentId ?? null)) {
      return existing
    }

    if (targetParentId) {
      const parent = await this._fetchNoteFolderEntry(targetParentId, userId)
      if (!parent || parent.is_deleted) {
        return null
      }
    }

    const position = await this._countNoteSiblings({
      parentId: targetParentId,
      userId,
      workspaceId: existing.workspaceId,
    })

    const { data, error } = await this.client
      .from('notes')
      .update({
        parent_id: targetParentId,
        position,
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(noteId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error
    return mapNoteRow(data)
  }

  async toggleFavoriteNote(noteId, userId) {
    const existing = await this._fetchNoteEntry(noteId, userId)
    if (!existing) return null

    const { data, error } = await this.client
      .from('notes')
      .update({ is_favorite: !existing.isFavorite, updated_at: new Date().toISOString() })
      .eq('id', String(noteId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error
    return mapNoteRow(data)
  }

  async getFavoriteNotes(userId) {
    const { data, error } = await this.client
      .from('notes')
      .select('*')
      .eq('user_id', String(userId))
      .eq('is_favorite', true)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map(mapNoteRow)
  }

  async getTrashNotes(userId) {
    const { data, error } = await this.client
      .from('notes')
      .select('*')
      .eq('user_id', String(userId))
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map(mapNoteRow)
  }

  async getNotesBreadcrumbs(folderId, userId) {
    const crumbs = []
    let currentId = String(folderId)

    while (currentId) {
      const { data, error } = await this.client
        .from('notes_folders')
        .select('*')
        .eq('id', String(currentId))
        .eq('user_id', String(userId))
        .limit(1)

      if (error) throw error
      const folder = data?.[0]
      if (!folder) break

      crumbs.unshift({ id: folder.id, title: folder.title, type: 'folder' })
      currentId = folder.parent_id
    }

    return crumbs
  }

  async _fetchNoteFolderEntry(folderId, userId) {
    const { data, error } = await this.client
      .from('notes_folders')
      .select('*')
      .eq('id', String(folderId))
      .eq('user_id', String(userId))
      .limit(1)

    if (error) throw error
    return data?.[0] ?? null
  }

  async getNotesFolderById(folderId, userId) {
    const row = await this._fetchNoteFolderEntry(folderId, userId)
    return mapNoteFolderRow(row)
  }

  async _fetchNoteItemEntry(itemId, userId) {
    const [folderRow, noteRow] = await Promise.all([
      this._fetchRow('notes_folders', itemId, userId),
      this._fetchRow('notes', itemId, userId),
    ])

    if (folderRow) return { table: 'notes_folders', item: mapNoteFolderRow(folderRow) }
    if (noteRow) return { table: 'notes', item: mapNoteRow(noteRow) }
    return { table: null, item: null }
  }

  async _listNoteChildren({ parentId, userId, workspaceId, includeDeleted = false }) {
    const folderQuery = applyParentFilter(
      this.client
        .from('notes_folders')
        .select('*')
        .eq('user_id', String(userId))
        .eq('workspace_id', String(workspaceId)),
      parentId,
    )

    const noteQuery = applyParentFilter(
      this.client
        .from('notes')
        .select('*')
        .eq('user_id', String(userId))
        .eq('workspace_id', String(workspaceId)),
      parentId,
    )

    if (!includeDeleted) {
      folderQuery.eq('is_deleted', false)
      noteQuery.eq('is_deleted', false)
    }

    const [foldersResult, notesResult] = await Promise.all([folderQuery, noteQuery])

    if (foldersResult.error) throw foldersResult.error
    if (notesResult.error) throw notesResult.error

    return [
      ...(foldersResult.data ?? []).map(mapNoteFolderRow),
      ...(notesResult.data ?? []).map(mapNoteRow),
    ]
  }

  async getNoteItemById(itemId, userId) {
    const entry = await this._fetchNoteItemEntry(itemId, userId)
    return entry.item
  }

  async softDeleteNoteItem(itemId, userId) {
    const entry = await this._fetchNoteItemEntry(itemId, userId)
    if (!entry.item) return null

    const nowIso = new Date().toISOString()
    const { data, error } = await this.client
      .from(entry.table)
      .update({ is_deleted: true, deleted_at: nowIso, updated_at: nowIso })
      .eq('id', String(itemId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error

    if (entry.item.type === 'folder') {
      const children = await this._listNoteChildren({
        parentId: itemId,
        userId,
        workspaceId: entry.item.workspaceId,
      })

      for (const child of children) {
        await this.softDeleteNoteItem(child.id, userId)
      }
    }

    return entry.table === 'notes_folders' ? mapNoteFolderRow(data) : mapNoteRow(data)
  }

  async restoreNoteItem(itemId, userId) {
    const entry = await this._fetchNoteItemEntry(itemId, userId)
    if (!entry.item || !entry.item.isDeleted) return null

    let nextParentId = entry.item.parentId
    if (nextParentId) {
      const parent = await this._fetchNoteItemEntry(nextParentId, userId)
      if (parent.item && parent.item.isDeleted) {
        nextParentId = null
      }
    }

    const { data, error } = await this.client
      .from(entry.table)
      .update({
        is_deleted: false,
        deleted_at: null,
        parent_id: nextParentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(itemId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error

    if (entry.item.type === 'folder') {
      const children = await this._listNoteChildren({
        parentId: itemId,
        userId,
        workspaceId: entry.item.workspaceId,
        includeDeleted: true,
      })

      for (const child of children) {
        if (child.isDeleted) {
          await this.restoreNoteItem(child.id, userId)
        }
      }
    }

    return entry.table === 'notes_folders' ? mapNoteFolderRow(data) : mapNoteRow(data)
  }

  async purgeNoteItem(itemId, userId) {
    const entry = await this._fetchNoteItemEntry(itemId, userId)
    if (!entry.item) return false

    if (entry.item.type === 'folder') {
      const children = await this._listNoteChildren({
        parentId: itemId,
        userId,
        workspaceId: entry.item.workspaceId,
        includeDeleted: true,
      })

      for (const child of children) {
        await this.purgeNoteItem(child.id, userId)
      }
    }

    const { error } = await this.client
      .from(entry.table)
      .delete()
      .eq('id', String(itemId))
      .eq('user_id', String(userId))

    if (error) throw error
    return true
  }

  async toggleFavoriteNoteItem(itemId, userId) {
    const entry = await this._fetchNoteItemEntry(itemId, userId)
    if (!entry.item) return null

    const { data, error } = await this.client
      .from(entry.table)
      .update({ is_favorite: !entry.item.isFavorite, updated_at: new Date().toISOString() })
      .eq('id', String(itemId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error
    return entry.table === 'notes_folders' ? mapNoteFolderRow(data) : mapNoteRow(data)
  }

  async moveNoteItem(itemId, userId, newParentId) {
    const entry = await this._fetchNoteItemEntry(itemId, userId)
    if (!entry.item) return null

    const targetParentId = newParentId ? String(newParentId) : null
    if (String(entry.item.parentId ?? null) === String(targetParentId ?? null)) {
      return entry.item
    }

    if (targetParentId) {
      const targetParent = await this._fetchNoteItemEntry(targetParentId, userId)
      if (!targetParent.item || targetParent.item.type !== 'folder' || targetParent.item.isDeleted) {
        return null
      }

      if (entry.item.type === 'folder') {
        let current = targetParentId
        while (current) {
          if (current === String(itemId)) return null
          const parent = await this._fetchNoteItemEntry(current, userId)
          if (!parent.item) return null
          current = parent.item.parentId
        }
      }
    }

    const position = await this._countNoteSiblings({
      parentId: targetParentId,
      userId,
      workspaceId: entry.item.workspaceId,
    })

    const { data, error } = await this.client
      .from(entry.table)
      .update({
        parent_id: targetParentId,
        position,
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(itemId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error
    return entry.table === 'notes_folders' ? mapNoteFolderRow(data) : mapNoteRow(data)
  }

  // TODO lists
  async createTodoList({ title, description, priority, targetDate, userId }) {
    const nowIso = new Date().toISOString()
    const { data, error } = await this.client
      .from('todo_lists')
      .insert({
        title: title.trim(),
        description: description ?? '',
        priority: priority ?? 0,
        target_date: targetDate ?? null,
        user_id: String(userId),
        is_deleted: false,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single()

    if (error) throw error
    return mapTodoListRow(data)
  }

  async getTodoLists(userId, { search, sortBy, sortOrder } = {}) {
    let query = this.client
      .from('todo_lists')
      .select('*')
      .eq('user_id', String(userId))
      .eq('is_deleted', false)

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const orderField =
      sortBy === 'title'
        ? 'title'
        : sortBy === 'createdAt'
          ? 'created_at'
          : 'updated_at'

    const { data, error } = await query.order(orderField, { ascending: sortOrder === 'asc' })
    if (error) throw error
    return Promise.all((data ?? []).map((row) => this._enrichTodoListRow(row)))
  }

  async getTodoListById(listId, userId) {
    const { data, error } = await this.client
      .from('todo_lists')
      .select('*')
      .eq('id', String(listId))
      .eq('user_id', String(userId))
      .eq('is_deleted', false)
      .limit(1)

    if (error) throw error
    return data?.[0] ? this._enrichTodoListRow(data[0]) : null
  }

  async _enrichTodoListRow(row) {
    let tasks = []
    try {
      tasks = await this._getTodoTasksByListId(row.id)
    } catch {
      tasks = []
    }
    return mapTodoListRow({
      ...row,
      taskCount: tasks.length,
      completedTaskCount: tasks.filter((task) => task.completed).length,
      completed: tasks.length > 0 && tasks.every((task) => task.completed),
      taskSearchText: tasks.map((task) => `${task.title} ${task.description ?? ''}`).join(' '),
    })
  }

  async updateTodoList(listId, userId, updates) {
    const existing = await this.getTodoListById(listId, userId)
    if (!existing) return null

    const payload = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) payload.title = updates.title.trim()
    if (updates.description !== undefined) payload.description = updates.description
    if (updates.priority !== undefined) payload.priority = updates.priority
    if (updates.targetDate !== undefined) payload.target_date = updates.targetDate

    const { data, error } = await this.client
      .from('todo_lists')
      .update(payload)
      .eq('id', String(listId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error
    return mapTodoListRow(data)
  }

  async softDeleteTodoList(listId, userId) {
    const existing = await this.getTodoListById(listId, userId)
    if (!existing) return null

    const nowIso = new Date().toISOString()
    const { data, error } = await this.client
      .from('todo_lists')
      .update({ is_deleted: true, deleted_at: nowIso, updated_at: nowIso })
      .eq('id', String(listId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error
    return mapTodoListRow(data)
  }

  async countTodoTasks(listId) {
    const { count, error } = await this.client
      .from('todo_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('list_id', String(listId))

    if (error) throw error
    return count ?? 0
  }

  async createTodoTask({ listId, userId, title, description, completed, priority, dueDate }) {
    const list = await this.getTodoListById(listId, userId)
    if (!list) return null

    const nowIso = new Date().toISOString()
    const orderIndex = await this.countTodoTasks(listId)
    const { data, error } = await this.client
      .from('todo_tasks')
      .insert({
        list_id: String(listId),
        title: title.trim(),
        description: description ?? '',
        completed: Boolean(completed),
        priority: priority ?? 0,
        due_date: dueDate ?? null,
        order_index: orderIndex,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single()

    if (error) throw error
    await this.updateTodoList(listId, userId, {})
    return mapTodoTaskRow(data)
  }

  async _getTodoTasksByListId(listId) {
    const { data, error } = await this.client
      .from('todo_tasks')
      .select('*')
      .eq('list_id', String(listId))
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data ?? []).map(mapTodoTaskRow)
  }

  async getTodoTasks(listId, userId) {
    const list = await this.getTodoListById(listId, userId)
    if (!list) return null

    return this._getTodoTasksByListId(listId)
  }

  async getTodoTaskById(taskId, userId) {
    const { data, error } = await this.client
      .from('todo_tasks')
      .select('*')
      .eq('id', String(taskId))
      .limit(1)

    if (error) throw error
    const task = mapTodoTaskRow(data?.[0])
    if (!task) return null

    const list = await this.getTodoListById(task.listId, userId)
    return list ? task : null
  }

  async updateTodoTask(taskId, userId, updates) {
    const existing = await this.getTodoTaskById(taskId, userId)
    if (!existing) return null

    const payload = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) payload.title = updates.title.trim()
    if (updates.description !== undefined) payload.description = updates.description
    if (updates.completed !== undefined) payload.completed = updates.completed
    if (updates.priority !== undefined) payload.priority = updates.priority
    if (updates.dueDate !== undefined) payload.due_date = updates.dueDate
    if (updates.orderIndex !== undefined) payload.order_index = updates.orderIndex

    const { data, error } = await this.client
      .from('todo_tasks')
      .update(payload)
      .eq('id', String(taskId))
      .select('*')
      .single()

    if (error) throw error
    await this.updateTodoList(existing.listId, userId, {})
    return mapTodoTaskRow(data)
  }

  async deleteTodoTask(taskId, userId) {
    const existing = await this.getTodoTaskById(taskId, userId)
    if (!existing) return false

    const { error } = await this.client.from('todo_tasks').delete().eq('id', String(taskId))
    if (error) throw error
    await this.updateTodoList(existing.listId, userId, {})
    return true
  }

  // Items
  async _fetchRow(table, id, userId) {
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .eq('id', String(id))
      .eq('user_id', String(userId))
      .limit(1)

    if (error) throw error
    return data?.[0] ?? null
  }

  async _fetchItemEntry(itemId, userId) {
    const [folderRow, fileRow] = await Promise.all([
      this._fetchRow('folders', itemId, userId),
      this._fetchRow('files', itemId, userId),
    ])

    if (folderRow) return { table: 'folders', item: mapFolderRow(folderRow) }
    if (fileRow) return { table: 'files', item: mapFileRow(fileRow) }
    return { table: null, item: null }
  }

  async _countSiblings({ parentId, userId, workspaceId }) {
    const folderQuery = applyParentFilter(
      this.client
        .from('folders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', String(userId))
        .eq('workspace_id', String(workspaceId))
        .eq('is_deleted', false),
      parentId,
    )

    const fileQuery = applyParentFilter(
      this.client
        .from('files')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', String(userId))
        .eq('workspace_id', String(workspaceId))
        .eq('is_deleted', false),
      parentId,
    )

    const [folderCount, fileCount] = await Promise.all([folderQuery, fileQuery])

    if (folderCount.error) throw folderCount.error
    if (fileCount.error) throw fileCount.error
    return (folderCount.count ?? 0) + (fileCount.count ?? 0)
  }

  async _listChildren({ parentId, userId, workspaceId, includeDeleted = false }) {
    const folderQuery = applyParentFilter(
      this.client
        .from('folders')
        .select('*')
        .eq('user_id', String(userId))
        .eq('workspace_id', String(workspaceId)),
      parentId,
    )

    const fileQuery = applyParentFilter(
      this.client
        .from('files')
        .select('*')
        .eq('user_id', String(userId))
        .eq('workspace_id', String(workspaceId)),
      parentId,
    )

    if (!includeDeleted) {
      folderQuery.eq('is_deleted', false)
      fileQuery.eq('is_deleted', false)
    }

    const [foldersResult, filesResult] = await Promise.all([folderQuery, fileQuery])

    if (foldersResult.error) throw foldersResult.error
    if (filesResult.error) throw filesResult.error

    return [
      ...(foldersResult.data ?? []).map(mapFolderRow),
      ...(filesResult.data ?? []).map(mapFileRow),
    ]
  }

  _sortItems(items, sortBy, sortOrder) {
    const ascending = sortOrder !== 'desc'
    const typeRank = { folder: 0, url: 1 }

    return items.sort((left, right) => {
      let comparison = 0

      if (sortBy === 'title') {
        comparison = compareValues(left.title?.toLowerCase(), right.title?.toLowerCase(), ascending)
      } else if (sortBy === 'createdAt') {
        comparison = compareValues(left.createdAt, right.createdAt, ascending)
      } else if (sortBy === 'updatedAt') {
        comparison = compareValues(left.updatedAt, right.updatedAt, ascending)
      } else if (sortBy === 'deletedAt') {
        comparison = compareValues(left.deletedAt, right.deletedAt, ascending)
      } else if (sortBy === 'type') {
        comparison = compareValues(typeRank[left.type], typeRank[right.type], ascending)
      } else {
        comparison = compareValues(left.position ?? 0, right.position ?? 0, ascending)
      }

      if (comparison !== 0) return comparison

      const positionComparison = compareValues(left.position ?? 0, right.position ?? 0, true)
      if (positionComparison !== 0) return positionComparison

      const typeComparison = compareValues(typeRank[left.type], typeRank[right.type], true)
      if (typeComparison !== 0) return typeComparison

      return compareValues(left.title?.toLowerCase(), right.title?.toLowerCase(), true)
    })
  }

  async createItem({
    title,
    type,
    url,
    description,
    icon,
    thumbnail,
    parentId,
    userId,
    workspaceId,
    metadata,
    color,
  }) {
    const position = await this._countSiblings({ parentId, userId, workspaceId })
    const nowIso = new Date().toISOString()

    if (type === 'folder') {
      const folderMetadata = color ? { ...(metadata ?? {}), color } : (metadata ?? {})
      const { data, error } = await this.client
        .from('folders')
        .insert({
          title,
          description: description ?? '',
          icon: icon ?? null,
          parent_id: parentId ? String(parentId) : null,
          user_id: String(userId),
          workspace_id: String(workspaceId),
          is_favorite: false,
          is_deleted: false,
          position,
          metadata: folderMetadata,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select('*')
        .single()

      if (error) throw error
      return mapFolderRow(data)
    }

    const { data, error } = await this.client
      .from('files')
      .insert({
        title,
        url: url ?? null,
        description: description ?? '',
        icon: icon ?? null,
        thumbnail: thumbnail ?? null,
        parent_id: parentId ? String(parentId) : null,
        user_id: String(userId),
        workspace_id: String(workspaceId),
        is_favorite: false,
        is_deleted: false,
        position,
        metadata: metadata ?? {},
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single()

    if (error) throw error
    return mapFileRow(data)
  }

  async getItemById(itemId, userId) {
    const { item } = await this._fetchItemEntry(itemId, userId)
    return item
  }

  async getItemsByParent({ parentId, userId, workspaceId, type, sortBy, sortOrder }) {
    const tables = type === 'folder' ? ['folders'] : type === 'url' ? ['files'] : ['folders', 'files']

    const responses = await Promise.all(
      tables.map((table) =>
        applyParentFilter(
          this.client
          .from(table)
          .select('*')
          .eq('user_id', String(userId))
          .eq('workspace_id', String(workspaceId))
          .eq('is_deleted', false),
          parentId,
        ),
      ),
    )

    for (const response of responses) {
      if (response.error) throw response.error
    }

    const items = responses.flatMap((response, index) =>
      (response.data ?? []).map((row) =>
        tables[index] === 'folders' ? mapFolderRow(row) : mapFileRow(row),
      ),
    )

    return this._sortItems(items, sortBy, sortOrder)
  }

  async updateItem(itemId, userId, updates) {
    const entry = await this._fetchItemEntry(itemId, userId)
    if (!entry.item) return null

    const payload = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) payload.title = updates.title
    if (updates.description !== undefined) payload.description = updates.description
    if (updates.icon !== undefined) payload.icon = updates.icon
    if (updates.metadata !== undefined) payload.metadata = updates.metadata
    if (updates.position !== undefined) payload.position = updates.position

    if (entry.table === 'files') {
      if (updates.url !== undefined) payload.url = updates.url
      if (updates.thumbnail !== undefined) payload.thumbnail = updates.thumbnail
    }

    const { data, error } = await this.client
      .from(entry.table)
      .update(payload)
      .eq('id', String(itemId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error
    return entry.table === 'folders' ? mapFolderRow(data) : mapFileRow(data)
  }

  async softDeleteItem(itemId, userId) {
    const entry = await this._fetchItemEntry(itemId, userId)
    if (!entry.item) return null

    const nowIso = new Date().toISOString()
    const { data, error } = await this.client
      .from(entry.table)
      .update({ is_deleted: true, deleted_at: nowIso, updated_at: nowIso })
      .eq('id', String(itemId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error

    if (entry.item.type === 'folder') {
      const children = await this._listChildren({
        parentId: itemId,
        userId,
        workspaceId: entry.item.workspaceId,
      })

      for (const child of children) {
        await this.softDeleteItem(child.id, userId)
      }
    }

    return entry.table === 'folders' ? mapFolderRow(data) : mapFileRow(data)
  }

  async restoreItem(itemId, userId) {
    const entry = await this._fetchItemEntry(itemId, userId)
    if (!entry.item || !entry.item.isDeleted) return null

    let nextParentId = entry.item.parentId
    if (nextParentId) {
      const parent = await this.getItemById(nextParentId, userId)
      if (parent && parent.isDeleted) {
        nextParentId = null
      }
    }

    const { data, error } = await this.client
      .from(entry.table)
      .update({
        is_deleted: false,
        deleted_at: null,
        parent_id: nextParentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(itemId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error

    if (entry.item.type === 'folder') {
      const children = await this._listChildren({
        parentId: itemId,
        userId,
        workspaceId: entry.item.workspaceId,
        includeDeleted: true,
      })

      for (const child of children) {
        if (child.isDeleted) {
          await this.restoreItem(child.id, userId)
        }
      }
    }

    return entry.table === 'folders' ? mapFolderRow(data) : mapFileRow(data)
  }

  async purgeItem(itemId, userId) {
    const entry = await this._fetchItemEntry(itemId, userId)
    if (!entry.item) return false

    if (entry.item.type === 'folder') {
      const children = await this._listChildren({
        parentId: itemId,
        userId,
        workspaceId: entry.item.workspaceId,
        includeDeleted: true,
      })

      for (const child of children) {
        await this.purgeItem(child.id, userId)
      }
    }

    const { error: tagError } = await this.client
      .from('item_tags')
      .delete()
      .eq('item_id', String(itemId))

    if (tagError) throw tagError

    const { error } = await this.client
      .from(entry.table)
      .delete()
      .eq('id', String(itemId))
      .eq('user_id', String(userId))

    if (error) throw error
    return true
  }

  async toggleFavorite(itemId, userId) {
    const entry = await this._fetchItemEntry(itemId, userId)
    if (!entry.item) return null

    const { data, error } = await this.client
      .from(entry.table)
      .update({ is_favorite: !entry.item.isFavorite, updated_at: new Date().toISOString() })
      .eq('id', String(itemId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error
    return entry.table === 'folders' ? mapFolderRow(data) : mapFileRow(data)
  }

  async moveItem(itemId, userId, newParentId) {
    const entry = await this._fetchItemEntry(itemId, userId)
    if (!entry.item) return null

    const targetParentId = newParentId ? String(newParentId) : null
    if (String(entry.item.parentId ?? null) === String(targetParentId ?? null)) {
      return entry.item
    }

    let targetParent = null
    if (targetParentId) {
      targetParent = await this.getItemById(targetParentId, userId)
      if (!targetParent || targetParent.type !== 'folder' || targetParent.isDeleted) {
        return null
      }

      let current = targetParentId
      while (current) {
        if (current === String(itemId)) return null
        const parent = await this.getItemById(current, userId)
        if (!parent) return null
        current = parent.parentId
      }
    }

    const position = await this._countSiblings({
      parentId: targetParentId,
      userId,
      workspaceId: entry.item.workspaceId,
    })

    const { data, error } = await this.client
      .from(entry.table)
      .update({
        parent_id: targetParentId,
        position,
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(itemId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error
    return entry.table === 'folders' ? mapFolderRow(data) : mapFileRow(data)
  }

  async getTrashItems(userId) {
    const [folderResult, fileResult] = await Promise.all([
      this.client
        .from('folders')
        .select('*')
        .eq('user_id', String(userId))
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false }),
      this.client
        .from('files')
        .select('*')
        .eq('user_id', String(userId))
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false }),
    ])

    if (folderResult.error) throw folderResult.error
    if (fileResult.error) throw fileResult.error

    return this._sortItems(
      [
        ...(folderResult.data ?? []).map(mapFolderRow),
        ...(fileResult.data ?? []).map(mapFileRow),
      ],
      'deletedAt',
      'desc',
    )
  }

  async getFavoriteItems(userId) {
    const [folderResult, fileResult] = await Promise.all([
      this.client
        .from('folders')
        .select('*')
        .eq('user_id', String(userId))
        .eq('is_favorite', true)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false }),
      this.client
        .from('files')
        .select('*')
        .eq('user_id', String(userId))
        .eq('is_favorite', true)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false }),
    ])

    if (folderResult.error) throw folderResult.error
    if (fileResult.error) throw fileResult.error

    return this._sortItems(
      [
        ...(folderResult.data ?? []).map(mapFolderRow),
        ...(fileResult.data ?? []).map(mapFileRow),
      ],
      'updatedAt',
      'desc',
    )
  }

  async getBreadcrumbs(itemId, userId) {
    const crumbs = []
    let currentId = String(itemId)

    while (currentId) {
      const entry = await this._fetchItemEntry(currentId, userId)
      if (!entry.item) break
      crumbs.unshift({ id: entry.item.id, title: entry.item.title, type: entry.item.type })
      currentId = entry.item.parentId
    }

    return crumbs
  }

  async bulkDeleteItems(itemIds, userId) {
    const results = []
    for (const id of itemIds) {
      const result = await this.softDeleteItem(id, userId)
      if (result) results.push(result)
    }
    return results
  }

  async bulkMoveItems(itemIds, userId, newParentId) {
    const results = []
    for (const id of itemIds) {
      const result = await this.moveItem(id, userId, newParentId)
      if (result) results.push(result)
    }
    return results
  }

  // Tags
  async createTag({ name, color, icon, userId }) {
    const { data, error } = await this.client
      .from('tags')
      .insert({
        name: name.trim(),
        color: color ?? '#7c3aed',
        icon: icon ?? null,
        user_id: String(userId),
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        return null
      }
      throw error
    }

    return mapTagRow(data)
  }

  async getTags(userId) {
    const { data, error } = await this.client
      .from('tags')
      .select('*')
      .eq('user_id', String(userId))

    if (error) throw error
    return (data ?? []).map(mapTagRow)
  }

  async getTagById(tagId, userId) {
    const { data, error } = await this.client
      .from('tags')
      .select('*')
      .eq('id', String(tagId))
      .eq('user_id', String(userId))
      .limit(1)

    if (error) throw error
    return mapTagRow(data?.[0])
  }

  async updateTag(tagId, userId, updates) {
    const payload = {}
    if (updates.name !== undefined) payload.name = updates.name.trim()
    if (updates.color !== undefined) payload.color = updates.color
    if (updates.icon !== undefined) payload.icon = updates.icon

    const { data, error } = await this.client
      .from('tags')
      .update(payload)
      .eq('id', String(tagId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error
    return mapTagRow(data)
  }

  async deleteTag(tagId, userId) {
    const { data, error } = await this.client
      .from('tags')
      .delete()
      .eq('id', String(tagId))
      .eq('user_id', String(userId))
      .select('id')
      .limit(1)

    if (error) throw error
    return Boolean(data?.[0])
  }

  async addTagToItem(itemId, tagId, userId) {
    const item = await this.getItemById(itemId, userId)
    const tag = await this.getTagById(tagId, userId)
    if (!item || !tag) return false

    const { error } = await this.client
      .from('item_tags')
      .upsert({ item_id: String(itemId), tag_id: String(tagId) }, { onConflict: 'item_id,tag_id' })

    if (error) throw error
    return true
  }

  async removeTagFromItem(itemId, tagId, userId) {
    const item = await this.getItemById(itemId, userId)
    const tag = await this.getTagById(tagId, userId)
    if (!item || !tag) return false

    const { error } = await this.client
      .from('item_tags')
      .delete()
      .eq('item_id', String(itemId))
      .eq('tag_id', String(tagId))

    if (error) throw error
    return true
  }

  async getTagsForItem(itemId) {
    const { data: tagLinks, error: linkError } = await this.client
      .from('item_tags')
      .select('tag_id')
      .eq('item_id', String(itemId))

    if (linkError) throw linkError
    const tagIds = (tagLinks ?? []).map((link) => link.tag_id)
    if (tagIds.length === 0) return []

    const { data, error } = await this.client.from('tags').select('*').in('id', tagIds)
    if (error) throw error
    return (data ?? []).map(mapTagRow)
  }

  async getItemsByTag(tagId, userId) {
    const { data: tagLinks, error: linkError } = await this.client
      .from('item_tags')
      .select('item_id')
      .eq('tag_id', String(tagId))

    if (linkError) throw linkError
    const itemIds = (tagLinks ?? []).map((link) => link.item_id)
    if (itemIds.length === 0) return []

    const [folderResult, fileResult] = await Promise.all([
      this.client
        .from('folders')
        .select('*')
        .in('id', itemIds)
        .eq('user_id', String(userId))
        .eq('is_deleted', false),
      this.client
        .from('files')
        .select('*')
        .in('id', itemIds)
        .eq('user_id', String(userId))
        .eq('is_deleted', false),
    ])

    if (folderResult.error) throw folderResult.error
    if (fileResult.error) throw fileResult.error

    return [
      ...(folderResult.data ?? []).map(mapFolderRow),
      ...(fileResult.data ?? []).map(mapFileRow),
    ]
  }

  async bulkTagItems(itemIds, tagId, userId) {
    const results = []
    for (const id of itemIds) {
      const ok = await this.addTagToItem(id, tagId, userId)
      if (ok) results.push(id)
    }
    return results
  }
}

function createSupabaseStore() {
  const client = createSupabaseClient()
  if (!client) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }
  return new SupabaseStore(client)
}

module.exports = {
  SupabaseStore,
  createSupabaseStore,
}
