const request = require('supertest')
const { createApp } = require('../src/app')
const { createSupabaseStore } = require('../src/db_service/supabase-store')

const hasSupabase = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
)
const run = hasSupabase ? describe : describe.skip

async function createAuthenticatedAgent(app) {
  const agent = request.agent(app)

  const signupRes = await agent.post('/api/v1/auth/signup').send({
    name: 'Phase2 Tester',
    email: `test-${Date.now()}@example.com`,
    password: 'supersafe123',
  })

  const accessToken = signupRes.body.data.accessToken
  return { agent, accessToken }
}

run('Phase 2 — Resource Management', () => {
  let app, accessToken, agent, workspaceId

  beforeAll(async () => {
    const store = createSupabaseStore()
    const created = createApp({
      store,
      jwtSecret: 'test-jwt-secret',
      refreshTokenSecret: 'test-refresh-secret',
    })
    app = created.app

    const auth = await createAuthenticatedAgent(app)
    agent = auth.agent
    accessToken = auth.accessToken

    // Get default workspace
    const wsRes = await agent
      .get('/api/v1/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)
    workspaceId = wsRes.body.data[0].id
  })

  it('creates a default workspace on signup', async () => {
    const res = await agent
      .get('/api/v1/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data[0].name).toBe('Personal')
    expect(res.body.data[0].isDefault).toBe(true)
  })

  it('creates a folder and lists it', async () => {
    const createRes = await agent
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Work',
        type: 'folder',
        workspaceId,
      })

    expect(createRes.status).toBe(201)
    expect(createRes.body.data.title).toBe('Work')
    expect(createRes.body.data.type).toBe('folder')

    const listRes = await agent
      .get(`/api/v1/items?workspaceId=${workspaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(listRes.status).toBe(200)
    expect(listRes.body.data.items.some((i) => i.title === 'Work')).toBe(true)
  })

  it('creates a URL resource', async () => {
    const res = await agent
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Example',
        type: 'url',
        url: 'https://example.com',
        description: 'A test resource',
        workspaceId,
      })

    expect(res.status).toBe(201)
    expect(res.body.data.type).toBe('url')
    expect(res.body.data.url).toBe('https://example.com')
  })

  it('creates nested folder and gets breadcrumbs', async () => {
    const parent = await agent
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Parent', type: 'folder', workspaceId })

    const child = await agent
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Child',
        type: 'folder',
        workspaceId,
        parentId: parent.body.data.id,
      })

    expect(child.status).toBe(201)

    const listRes = await agent
      .get(`/api/v1/items?workspaceId=${workspaceId}&parentId=${parent.body.data.id}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(listRes.body.data.breadcrumbs.length).toBeGreaterThanOrEqual(1)
    expect(listRes.body.data.items.some((i) => i.title === 'Child')).toBe(true)
  })

  it('updates an item', async () => {
    const createRes = await agent
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'ToUpdate', type: 'folder', workspaceId })

    const updateRes = await agent
      .put(`/api/v1/items/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated Title', description: 'New desc' })

    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data.title).toBe('Updated Title')
    expect(updateRes.body.data.description).toBe('New desc')
  })

  it('soft-deletes and restores an item', async () => {
    const createRes = await agent
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'ToDelete', type: 'folder', workspaceId })

    const itemId = createRes.body.data.id

    const deleteRes = await agent
      .delete(`/api/v1/items/${itemId}`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(deleteRes.status).toBe(200)

    // Should be in trash
    const trashRes = await agent
      .get('/api/v1/items/trash')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(trashRes.body.data.some((i) => i.id === itemId)).toBe(true)

    // Restore
    const restoreRes = await agent
      .post(`/api/v1/items/${itemId}/restore`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(restoreRes.status).toBe(200)
    expect(restoreRes.body.data.isDeleted).toBe(false)
  })

  it('toggles favorite', async () => {
    const createRes = await agent
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'ToFave', type: 'folder', workspaceId })

    const itemId = createRes.body.data.id

    const faveRes = await agent
      .post(`/api/v1/items/${itemId}/favorite`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(faveRes.body.data.isFavorite).toBe(true)

    const unfaveRes = await agent
      .post(`/api/v1/items/${itemId}/favorite`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(unfaveRes.body.data.isFavorite).toBe(false)
  })

  it('creates and assigns tags', async () => {
    const tagRes = await agent
      .post('/api/v1/tags')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Important', color: '#ef4444' })

    expect(tagRes.status).toBe(201)
    expect(tagRes.body.data.name).toBe('Important')

    const createRes = await agent
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'TaggedItem', type: 'folder', workspaceId })

    const assignRes = await agent
      .post(`/api/v1/items/${createRes.body.data.id}/tags/${tagRes.body.data.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(assignRes.status).toBe(200)

    // Verify tag appears on item
    const getRes = await agent
      .get(`/api/v1/items/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(getRes.body.data.tags.some((t) => t.name === 'Important')).toBe(true)
  })

  it('moves an item to a different folder', async () => {
    const folder = await agent
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Target', type: 'folder', workspaceId })

    const item = await agent
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Moveable', type: 'folder', workspaceId })

    const moveRes = await agent
      .post(`/api/v1/items/${item.body.data.id}/move`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ parentId: folder.body.data.id })

    expect(moveRes.status).toBe(200)
    expect(moveRes.body.data.parentId).toBe(folder.body.data.id)
  })

  it('bulk deletes items', async () => {
    const item1 = await agent
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Bulk1', type: 'folder', workspaceId })

    const item2 = await agent
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Bulk2', type: 'folder', workspaceId })

    const bulkRes = await agent
      .post('/api/v1/items/bulk')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        action: 'delete',
        itemIds: [item1.body.data.id, item2.body.data.id],
      })

    expect(bulkRes.status).toBe(200)
    expect(bulkRes.body.data.affected).toBe(2)
  })

  it('permanently purges an item', async () => {
    const createRes = await agent
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'ToPurge', type: 'folder', workspaceId })

    const itemId = createRes.body.data.id

    await agent.delete(`/api/v1/items/${itemId}`).set('Authorization', `Bearer ${accessToken}`)

    const purgeRes = await agent
      .delete(`/api/v1/items/${itemId}/purge`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(purgeRes.status).toBe(200)

    const getRes = await agent
      .get(`/api/v1/items/${itemId}`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(getRes.status).toBe(404)
  })
})
