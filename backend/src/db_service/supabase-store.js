const crypto = require('node:crypto')
const { createSupabaseClient } = require('./supabase')
const { SESSION_STALE_SECONDS } = require('../services/auth-service')

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
  const metadata = row.metadata ?? {}
  const mergedMetadata = row.color && !metadata.color ? { ...metadata, color: row.color } : metadata
  return {
    id: row.id,
    title: row.title,
    type: 'folder',
    url: null,
    description: row.description ?? '',
    icon: row.icon,
    color: row.color ?? null,
    thumbnail: null,
    parentId: row.parent_id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    isFavorite: row.is_favorite,
    isDeleted: row.is_deleted,
    position: row.position,
    metadata: mergedMetadata,
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

// Maps snake_case profile columns to the camelCase API shape.
const PROFILE_COLUMNS = {
  avatar_url: 'avatarUrl',
  display_name: 'displayName',
  bio: 'bio',
  phone: 'phone',
  address_line1: 'addressLine1',
  address_line2: 'addressLine2',
  city: 'city',
  state: 'state',
  postal_code: 'postalCode',
  country: 'country',
  timezone: 'timezone',
}

function mapProfileRow(row) {
  if (!row) return null
  const profile = { userId: row.user_id, createdAt: row.created_at, updatedAt: row.updated_at }
  for (const [column, key] of Object.entries(PROFILE_COLUMNS)) {
    profile[key] = row[column] ?? null
  }
  return profile
}

let warnedMissingProfilesTable = false
function warnMissingProfilesTable() {
  if (warnedMissingProfilesTable) return
  warnedMissingProfilesTable = true
  // eslint-disable-next-line no-console
  console.warn(
    '[store] user_profiles table is missing; profile details are unavailable ' +
      'until 20260828_user_profiles.sql is applied.',
  )
}

// The session-metadata migration may not be applied yet. Warn once rather than
// on every request, so logs stay readable.
let warnedMissingSessionColumns = false
function warnMissingSessionColumns() {
  if (warnedMissingSessionColumns) return
  warnedMissingSessionColumns = true
  // eslint-disable-next-line no-console
  console.warn(
    '[store] refresh_tokens is missing session columns; the concurrent-session ' +
      'limit is INACTIVE until 20260828_session_device_metadata.sql is applied.',
  )
}

const staleCutoffIso = () => new Date(Date.now() - SESSION_STALE_SECONDS * 1000).toISOString()

class SupabaseStore {
  constructor(client) {
    this.client = client
  }

  // Users
  async createUser({ name, email, passwordHash }) {
    const normalizedEmail = email.trim().toLowerCase()

    // Pre-check gives a clean 409 even if the unique index is not yet applied.
    // The index below is what actually guarantees correctness under races.
    const { data: existing, error: lookupError } = await this.client
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .limit(1)

    if (lookupError) throw lookupError
    if (existing && existing.length > 0) return null

    const { data, error } = await this.client
      .from('users')
      .insert({ name, email: normalizedEmail, password_hash: passwordHash })
      .select('*')
      .single()

    if (error) {
      // 23505 = unique_violation. Two concurrent signups can both clear the
      // pre-check above; the database is the authority that settles the race.
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
    // Ordered by created_at so the row returned is deterministic. A unique
    // index on lower(trim(email)) makes duplicates impossible going forward,
    // but ordering keeps login stable for any that predate it.
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .order('created_at', { ascending: true })
      .limit(2)

    if (error) throw error

    if (data && data.length > 1) {
      // eslint-disable-next-line no-console
      console.warn(
        `[store] ${data.length}+ accounts share email ${normalizedEmail}; ` +
          'using the oldest. Apply the users_email_unique_idx migration.',
      )
    }

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

  // User profiles
  async getUserProfile(userId) {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('user_id', String(userId))
      .limit(1)

    if (error) {
      // Missing table: migration not applied yet. PostgREST reports PGRST205
      // from its schema cache; 42P01 is the raw Postgres code. Return an empty
      // profile so the page renders rather than 500ing.
      if (error.code === 'PGRST205' || error.code === '42P01') {
        warnMissingProfilesTable()
        return null
      }
      throw error
    }

    return data?.[0] ? mapProfileRow(data[0]) : null
  }

  async upsertUserProfile(userId, fields) {
    const payload = { user_id: String(userId) }
    // Only assign keys the caller actually supplied, so a partial update
    // cannot blank out fields it did not mention.
    for (const [column, value] of Object.entries(PROFILE_COLUMNS)) {
      if (fields[value] !== undefined) payload[column] = fields[value]
    }

    const { data, error } = await this.client
      .from('user_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single()

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        warnMissingProfilesTable()
        return null
      }
      throw error
    }

    return mapProfileRow(data)
  }

  async updateUserName(userId, name) {
    const { data, error } = await this.client
      .from('users')
      .update({ name })
      .eq('id', String(userId))
      .select('*')
      .single()

    if (error) throw error
    return mapUserRow(data)
  }

  // Refresh tokens
  async storeRefreshToken({ userId, token, userAgent, ipAddress }) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const nowIso = new Date().toISOString()
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString()

    const { error } = await this.client.from('refresh_tokens').insert({
      token_hash: tokenHash,
      user_id: String(userId),
      revoked_at: null,
      expires_at: expiresAt,
      // Display-only context so a user can recognize their own sessions.
      user_agent: userAgent ?? null,
      ip_address: ipAddress ?? null,
      last_used_at: nowIso,
    })

    if (error) {
      // Same pre-migration fallback: fall back to the original column set so
      // login still works, just without device metadata.
      if (error.code === '42703' || error.code === 'PGRST204') {
        const { error: retryError } = await this.client.from('refresh_tokens').insert({
          token_hash: tokenHash,
          user_id: String(userId),
          revoked_at: null,
          expires_at: expiresAt,
        })
        if (retryError) throw retryError
        return
      }
      throw error
    }
  }

  // Active = not revoked, not expired and not stale. This is the definition the
  // session limit enforces, so listing and counting must agree exactly.
  async listActiveSessions(userId) {
    const nowIso = new Date().toISOString()
    const { data, error } = await this.client
      .from('refresh_tokens')
      .select('id, token_hash, user_agent, ip_address, created_at, last_used_at, expires_at')
      .eq('user_id', String(userId))
      .is('revoked_at', null)
      .gt('expires_at', nowIso)
      .gt('last_used_at', staleCutoffIso())
      .order('last_used_at', { ascending: false })

    if (error) {
      // 42703 = undefined_column: the device-metadata migration has not been
      // applied yet. Report "no sessions" rather than throwing, so that a
      // code-before-migration deploy cannot lock every user out of login.
      if (error.code === '42703') {
        warnMissingSessionColumns()
        return []
      }
      throw error
    }

    return data ?? []
  }

  async countActiveSessions(userId) {
    const sessions = await this.listActiveSessions(userId)
    return sessions.length
  }

  async revokeSessionById({ sessionId, userId }) {
    // Scoped by user_id so one account can never revoke another's session.
    const { data, error } = await this.client
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', String(userId))
      .is('revoked_at', null)
      .select('id')

    if (error) {
      // Pre-migration there is no id column, so no session can be addressed.
      // Report "not found" rather than a 500; listActiveSessions returns an
      // empty list in the same state, so nothing can reach here legitimately.
      if (error.code === '42703' || error.code === 'PGRST204') {
        warnMissingSessionColumns()
        return false
      }
      throw error
    }

    return (data ?? []).length > 0
  }

  // Marks a live session as in use. Returns false when the session is revoked,
  // expired or already stale, so the caller can tell the client it was ended.
  async touchRefreshToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const { data, error } = await this.client
      .from('refresh_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .gt('last_used_at', staleCutoffIso())
      .select('token_hash')

    if (error) {
      // Pre-migration there is no activity column; treat the session as live.
      if (error.code === '42703' || error.code === 'PGRST204') {
        warnMissingSessionColumns()
        return Boolean(await this.findValidRefreshToken(token))
      }
      throw error
    }

    return (data ?? []).length > 0
  }

  async rotateRefreshToken({ oldToken, newToken, userId, userAgent, ipAddress }) {
    await this.revokeRefreshToken(oldToken)
    await this.storeRefreshToken({ userId, token: newToken, userAgent, ipAddress })
  }

  async findValidRefreshToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const nowIso = new Date().toISOString()

    const query = () =>
      this.client
        .from('refresh_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .is('revoked_at', null)
        .gt('expires_at', nowIso)

    // Stale sessions can't be refreshed: the idle timeout is enforced here, not
    // only in the browser, so reopening a closed tab later requires a login.
    const { data, error } = await query().gt('last_used_at', staleCutoffIso()).limit(1)

    if (error) {
      if (error.code === '42703') {
        warnMissingSessionColumns()
        const { data: fallback, error: fallbackError } = await query().limit(1)
        if (fallbackError) throw fallbackError
        return fallback?.[0] ?? null
      }
      throw error
    }
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

  /**
   * Workspace-wide note search across folder titles, note titles, and note
   * bodies. Mirrors searchItems so both tabs behave the same.
   */
  async searchNotes({ userId, workspaceId, query, limit = 50 }) {
    const term = String(query ?? '').trim()
    if (!term) return []

    // Escape pattern wildcards and drop PostgREST filter separators.
    const escaped = term.replace(/[%_\\]/g, (c) => `\\${c}`).replace(/[(),]/g, ' ')
    const pattern = `%${escaped}%`

    const tables = ['notes_folders', 'notes']
    const responses = await Promise.all(
      tables.map((table) => {
        // Folders carry a description; notes carry body content.
        const columns =
          table === 'notes_folders'
            ? `title.ilike.${pattern},description.ilike.${pattern}`
            : `title.ilike.${pattern},content.ilike.${pattern}`

        return this.client
          .from(table)
          .select('*')
          .eq('user_id', String(userId))
          .eq('workspace_id', String(workspaceId))
          .eq('is_deleted', false)
          .or(columns)
          .limit(limit)
      }),
    )

    for (const response of responses) {
      if (response.error) throw response.error
    }

    const items = responses.flatMap((response, index) =>
      (response.data ?? []).map((row) =>
        tables[index] === 'notes_folders' ? mapNoteFolderRow(row) : mapNoteRow(row),
      ),
    )

    const lowered = term.toLowerCase()
    const score = (item) => {
      const title = (item.title ?? '').toLowerCase()
      if (title === lowered) return 0
      if (title.startsWith(lowered)) return 1
      if (title.includes(lowered)) return 2
      return 3
    }

    return items
      .sort((left, right) => {
        const diff = score(left) - score(right)
        if (diff !== 0) return diff
        return (left.title ?? '').localeCompare(right.title ?? '')
      })
      .slice(0, limit)
  }

  /** Note-folder id -> path segments, for labelling search results. */
  async getNotesFolderPathMap({ userId, workspaceId }) {
    const { data, error } = await this.client
      .from('notes_folders')
      .select('id, title, parent_id')
      .eq('user_id', String(userId))
      .eq('workspace_id', String(workspaceId))
      .eq('is_deleted', false)

    if (error) throw error

    const byId = new Map((data ?? []).map((row) => [String(row.id), row]))
    const cache = new Map()

    const pathFor = (id, seen = new Set()) => {
      const key = String(id)
      if (cache.has(key)) return cache.get(key)
      const row = byId.get(key)
      if (!row) return []
      if (seen.has(key)) return []
      seen.add(key)
      const parentPath = row.parent_id ? pathFor(row.parent_id, seen) : []
      const full = [...parentPath, row.title]
      cache.set(key, full)
      return full
    }

    const paths = new Map()
    for (const key of byId.keys()) paths.set(key, pathFor(key))
    return paths
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

  // Starred notes and note folders (folders live in their own table).
  async getFavoriteNotes(userId) {
    const [folders, notes] = await Promise.all(
      ['notes_folders', 'notes'].map((table) =>
        this.client
          .from(table)
          .select('*')
          .eq('user_id', String(userId))
          .eq('is_favorite', true)
          .eq('is_deleted', false),
      ),
    )
    if (folders.error) throw folders.error
    if (notes.error) throw notes.error
    return [...(folders.data ?? []).map(mapNoteFolderRow), ...(notes.data ?? []).map(mapNoteRow)].sort(
      (a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)),
    )
  }

  // Trashed notes and note folders, most recently deleted first.
  async getTrashNotes(userId) {
    const [folders, notes] = await Promise.all(
      ['notes_folders', 'notes'].map((table) =>
        this.client.from(table).select('*').eq('user_id', String(userId)).eq('is_deleted', true),
      ),
    )
    if (folders.error) throw folders.error
    if (notes.error) throw notes.error
    return [...(folders.data ?? []).map(mapNoteFolderRow), ...(notes.data ?? []).map(mapNoteRow)].sort(
      (a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)),
    )
  }

  // Dashboard numbers and recent activity for one workspace, across every
  // folder (not just the top level).
  async getWorkspaceOverview({ userId, workspaceId, recentLimit = 8 }) {
    const scoped = (table, select = '*', head = false) =>
      this.client
        .from(table)
        .select(select, head ? { count: 'exact', head: true } : undefined)
        .eq('user_id', String(userId))
        .eq('workspace_id', String(workspaceId))
        .eq('is_deleted', false)

    const results = await Promise.all([
      scoped('folders', 'id', true),
      scoped('files', 'id', true),
      scoped('notes', 'id', true),
      scoped('folders').order('updated_at', { ascending: false }).limit(recentLimit),
      scoped('files').order('updated_at', { ascending: false }).limit(recentLimit),
      scoped('notes').order('updated_at', { ascending: false }).limit(6),
    ])
    for (const result of results) if (result.error) throw result.error
    const [folderCount, fileCount, noteCount, recentFolders, recentFiles, recentNotes] = results

    const recentResources = [
      ...(recentFolders.data ?? []).map(mapFolderRow),
      ...(recentFiles.data ?? []).map(mapFileRow),
    ]
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .slice(0, recentLimit)

    return {
      counts: { folders: folderCount.count ?? 0, links: fileCount.count ?? 0, notes: noteCount.count ?? 0 },
      recentResources,
      recentNotes: (recentNotes.data ?? []).map(mapNoteRow),
    }
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

  // Notes and note folders live in separate tables; send the update to
  // whichever holds this id. Folders take only a title and description.
  async updateNoteItem(itemId, userId, updates) {
    const entry = await this._fetchNoteItemEntry(itemId, userId)
    if (!entry.item) return null
    if (entry.table === 'notes') return this.updateNote(itemId, userId, updates)

    const payload = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) payload.title = updates.title
    if (updates.description !== undefined) payload.description = updates.description

    const { data, error } = await this.client
      .from('notes_folders')
      .update(payload)
      .eq('id', String(itemId))
      .eq('user_id', String(userId))
      .select('*')
      .single()

    if (error) throw error
    return mapNoteFolderRow(data)
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
    // Folders first; every non-folder ranks equally after them. Notes use
    // type 'note', resources use 'url', so default rather than enumerate.
    const rankOf = (type) => (type === 'folder' ? 0 : 1)

    return items.sort((left, right) => {
      // Folders always precede files, whatever the sort column — the way Drive
      // behaves. Sorting by `type` explicitly is the one exception, since there
      // the user is asking for type to be the ordering.
      if (sortBy !== 'type') {
        const groupComparison = compareValues(rankOf(left.type), rankOf(right.type), true)
        if (groupComparison !== 0) return groupComparison
      }

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
        comparison = compareValues(rankOf(left.type), rankOf(right.type), ascending)
      } else {
        comparison = compareValues(left.position ?? 0, right.position ?? 0, ascending)
      }

      if (comparison !== 0) return comparison

      const positionComparison = compareValues(left.position ?? 0, right.position ?? 0, true)
      if (positionComparison !== 0) return positionComparison

      const typeComparison = compareValues(rankOf(left.type), rankOf(right.type), true)
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
          color: color ?? null,
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

  // Workspace-wide search across folders and links, matching title, URL, and
  // description. Deliberately ignores the current folder: Drive-style search
  // looks everywhere, and results carry their own path for context.
  async searchItems({ userId, workspaceId, query, limit = 50 }) {
    const term = String(query ?? '').trim()
    if (!term) return []

    // Escape PostgREST pattern wildcards, and drop its filter separators, so a
    // literal % or , in a query cannot alter the filter it is spliced into.
    const escaped = term.replace(/[%_\\]/g, (c) => `\\${c}`).replace(/[(),]/g, ' ')
    const pattern = `%${escaped}%`

    const tables = ['folders', 'files']
    const responses = await Promise.all(
      tables.map((table) => {
        // Folders have no url column; only files match on it.
        const columns =
          table === 'folders'
            ? `title.ilike.${pattern},description.ilike.${pattern}`
            : `title.ilike.${pattern},description.ilike.${pattern},url.ilike.${pattern}`

        return this.client
          .from(table)
          .select('*')
          .eq('user_id', String(userId))
          .eq('workspace_id', String(workspaceId))
          .eq('is_deleted', false)
          .or(columns)
          .limit(limit)
      }),
    )

    for (const response of responses) {
      if (response.error) throw response.error
    }

    const items = responses.flatMap((response, index) =>
      (response.data ?? []).map((row) =>
        tables[index] === 'folders' ? mapFolderRow(row) : mapFileRow(row),
      ),
    )

    // Rank by how well the title matches, so exact and prefix hits lead.
    const lowered = term.toLowerCase()
    const score = (item) => {
      const title = (item.title ?? '').toLowerCase()
      if (title === lowered) return 0
      if (title.startsWith(lowered)) return 1
      if (title.includes(lowered)) return 2
      return 3
    }

    return items
      .sort((left, right) => {
        const diff = score(left) - score(right)
        if (diff !== 0) return diff
        return (left.title ?? '').localeCompare(right.title ?? '')
      })
      .slice(0, limit)
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
    if (updates.color !== undefined && entry.table === 'folders') payload.color = updates.color
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

  /**
   * Folder id -> "Parent / Child" path for a whole workspace, in one query.
   * getBreadcrumbs walks ancestors one query per level; calling it per search
   * result multiplied that across the result set.
   */
  async getFolderPathMap({ userId, workspaceId }) {
    const { data, error } = await this.client
      .from('folders')
      .select('id, title, parent_id')
      .eq('user_id', String(userId))
      .eq('workspace_id', String(workspaceId))
      .eq('is_deleted', false)

    if (error) throw error

    const byId = new Map((data ?? []).map((row) => [String(row.id), row]))
    const cache = new Map()

    const pathFor = (id, seen = new Set()) => {
      const key = String(id)
      if (cache.has(key)) return cache.get(key)
      const row = byId.get(key)
      if (!row) return []
      // Guard against a cycle from corrupt parent links.
      if (seen.has(key)) return []
      seen.add(key)

      const parentPath = row.parent_id ? pathFor(row.parent_id, seen) : []
      const full = [...parentPath, row.title]
      cache.set(key, full)
      return full
    }

    const paths = new Map()
    for (const key of byId.keys()) paths.set(key, pathFor(key))
    return paths
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

  // Live (not trashed) items per tag, in a fixed number of queries.
  async getTagItemCounts(tagIds) {
    const counts = new Map(tagIds.map((id) => [String(id), 0]))
    if (tagIds.length === 0) return counts

    const { data: links, error } = await this.client
      .from('item_tags')
      .select('item_id, tag_id')
      .in('tag_id', tagIds.map(String))
    if (error) throw error
    if (!links || links.length === 0) return counts

    const itemIds = [...new Set(links.map((link) => link.item_id))]
    const [folders, files] = await Promise.all(
      ['folders', 'files'].map((table) =>
        this.client.from(table).select('id').in('id', itemIds).eq('is_deleted', false),
      ),
    )
    if (folders.error) throw folders.error
    if (files.error) throw files.error
    const live = new Set([...(folders.data ?? []), ...(files.data ?? [])].map((row) => String(row.id)))

    for (const link of links) {
      if (live.has(String(link.item_id))) {
        counts.set(String(link.tag_id), (counts.get(String(link.tag_id)) ?? 0) + 1)
      }
    }
    return counts
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

    // PGRST116: no row matched (not found / not this user's). A duplicate
    // name (23505) is rethrown for the route to report as a conflict.
    if (error?.code === 'PGRST116') return null
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

  /**
   * Tags for many items in two queries total, rather than two per item.
   * The per-item version is an N+1: on a 34-item listing it issued 68 round
   * trips, and against a remote database each costs ~200ms of latency.
   * Returns a Map of itemId -> tags[].
   */
  async getTagsForItems(itemIds) {
    const ids = (itemIds ?? []).map(String).filter(Boolean)
    const byItem = new Map(ids.map((id) => [id, []]))
    if (ids.length === 0) return byItem

    const { data: links, error: linkError } = await this.client
      .from('item_tags')
      .select('item_id, tag_id')
      .in('item_id', ids)

    if (linkError) throw linkError
    if (!links || links.length === 0) return byItem

    const tagIds = [...new Set(links.map((link) => link.tag_id))]
    const { data: tags, error: tagError } = await this.client
      .from('tags')
      .select('*')
      .in('id', tagIds)

    if (tagError) throw tagError

    const tagsById = new Map((tags ?? []).map((row) => [String(row.id), mapTagRow(row)]))
    for (const link of links) {
      const tag = tagsById.get(String(link.tag_id))
      if (tag) byItem.get(String(link.item_id))?.push(tag)
    }

    return byItem
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
