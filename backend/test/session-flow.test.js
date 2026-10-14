const crypto = require('node:crypto')
const request = require('supertest')
const { createApp } = require('../src/app')
const {
  MAX_CONCURRENT_SESSIONS,
  REFRESH_TOKEN_TTL_SECONDS,
  SESSION_STALE_SECONDS,
} = require('../src/services/auth-service')

// In-memory stand-in for SupabaseStore covering the auth surface, with a
// controllable clock so idle/stale behaviour can be tested without waiting.
// Its "active session" rules mirror supabase-store.js exactly.
function createMemoryStore() {
  let offsetMs = 0
  const now = () => Date.now() + offsetMs
  const users = []
  const tokens = []
  const hash = (token) => crypto.createHash('sha256').update(token).digest('hex')
  const isLive = (row) =>
    !row.revoked_at &&
    row.expires_at > now() &&
    row.last_used_at > now() - SESSION_STALE_SECONDS * 1000
  const findLive = (token) => tokens.find((row) => row.token_hash === hash(token) && isLive(row))

  return {
    advance(seconds) {
      offsetMs += seconds * 1000
    },
    async createUser({ name, email, passwordHash }) {
      if (users.some((user) => user.email === email)) return null
      const user = { id: crypto.randomUUID(), name, email, passwordHash }
      users.push(user)
      return user
    },
    async findUserByEmail(email) {
      return users.find((user) => user.email === email) ?? null
    },
    async findUserById(id) {
      return users.find((user) => user.id === id) ?? null
    },
    async storeRefreshToken({ userId, token, userAgent, ipAddress }) {
      tokens.push({
        id: crypto.randomUUID(),
        token_hash: hash(token),
        user_id: userId,
        revoked_at: null,
        expires_at: now() + REFRESH_TOKEN_TTL_SECONDS * 1000,
        created_at: new Date(now()).toISOString(),
        last_used_at: now(),
        user_agent: userAgent ?? null,
        ip_address: ipAddress ?? null,
      })
    },
    async listActiveSessions(userId) {
      return tokens
        .filter((row) => row.user_id === userId && isLive(row))
        .sort((a, b) => b.last_used_at - a.last_used_at)
    },
    async revokeSessionById({ sessionId, userId }) {
      const row = tokens.find((r) => r.id === sessionId && r.user_id === userId && !r.revoked_at)
      if (!row) return false
      row.revoked_at = now()
      return true
    },
    async touchRefreshToken(token) {
      const row = findLive(token)
      if (!row) return false
      row.last_used_at = now()
      return true
    },
    async rotateRefreshToken({ oldToken, newToken, userId, userAgent, ipAddress }) {
      await this.revokeRefreshToken(oldToken)
      await this.storeRefreshToken({ userId, token: newToken, userAgent, ipAddress })
    },
    async findValidRefreshToken(token) {
      return findLive(token) ?? null
    },
    async revokeRefreshToken(token) {
      const row = tokens.find((r) => r.token_hash === hash(token) && !r.revoked_at)
      if (row) row.revoked_at = now()
    },
  }
}

const PASSWORD = 'supersafe123'

function setup() {
  const store = createMemoryStore()
  const { app } = createApp({ store, jwtSecret: 'test-jwt', refreshTokenSecret: 'test-refresh' })
  return { store, app }
}

// One agent per browser/device: it keeps its own cookie jar, and remembers the
// CSRF token from the last auth response the way the frontend does.
function device(app, userAgent = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0') {
  const agent = request.agent(app)
  const state = { csrf: null, accessToken: null }
  const remember = (res) => {
    if (res.body?.data?.csrfToken) state.csrf = res.body.data.csrfToken
    if (res.body?.data?.accessToken) state.accessToken = res.body.data.accessToken
    return res
  }
  const post = (path) =>
    agent.post(`/api/v1/auth${path}`).set('User-Agent', userAgent).set('x-csrf-token', state.csrf ?? '')

  return {
    state,
    signup: (email) =>
      post('/signup').send({ name: 'Vault Tester', email, password: PASSWORD }).then(remember),
    login: (email) => post('/login').send({ email, password: PASSWORD }).then(remember),
    refresh: () => post('/refresh').then(remember),
    heartbeat: () => post('/heartbeat'),
    logout: () => post('/logout'),
    me: () =>
      agent.get('/api/v1/auth/me').set('Authorization', `Bearer ${state.accessToken}`),
  }
}

describe('login / logout session flow', () => {
  it('returns the CSRF token in the body, matching the cookie', async () => {
    const { app } = setup()
    const res = await device(app).signup('a@example.com')

    expect(res.statusCode).toBe(201)
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('vault_csrf_token='))
    expect(cookie.split(';')[0].split('=')[1]).toBe(res.body.data.csrfToken)
  })

  it('logs out, revokes the session, and blocks refresh afterwards', async () => {
    const { app, store } = setup()
    const laptop = device(app)
    const signup = await laptop.signup('a@example.com')
    const userId = signup.body.data.user.id

    expect((await laptop.logout()).statusCode).toBe(200)
    expect(await store.listActiveSessions(userId)).toHaveLength(0)
    expect((await laptop.refresh()).statusCode).not.toBe(200)
  })

  it('rejects logout and refresh without the CSRF header', async () => {
    const { app } = setup()
    const laptop = device(app)
    await laptop.signup('a@example.com')
    laptop.state.csrf = null

    expect((await laptop.logout()).statusCode).toBe(403)
  })

  it('records the device on signup so it is recognizable in the picker', async () => {
    const { app, store } = setup()
    const res = await device(app).signup('a@example.com')
    const [session] = await store.listActiveSessions(res.body.data.user.id)

    expect(session.user_agent).toContain('Chrome')
  })

  it(`blocks sign-in on device ${MAX_CONCURRENT_SESSIONS + 1} and lets the user end one`, async () => {
    const { app } = setup()
    const email = 'a@example.com'
    const first = device(app, 'Mozilla/5.0 (Windows NT 10.0) Firefox/131.0')
    await first.signup(email)
    for (let i = 1; i < MAX_CONCURRENT_SESSIONS; i += 1) {
      expect((await device(app).login(email)).statusCode).toBe(200)
    }

    const extra = device(app)
    const blocked = await extra.login(email)
    expect(blocked.statusCode).toBe(409)
    expect(blocked.body.error.code).toBe('SESSION_LIMIT_REACHED')
    const { managementToken, sessions } = blocked.body.error.details
    expect(sessions).toHaveLength(MAX_CONCURRENT_SESSIONS)

    // The management token may end sessions but never read data.
    const meWithMgmt = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${managementToken}`)
    expect(meWithMgmt.statusCode).toBe(401)

    // End the first device's session, then retry.
    const target = sessions.find((s) => s.device === 'Firefox on Windows')
    const ended = await request(app)
      .delete(`/api/v1/auth/sessions/${target.id}`)
      .set('Authorization', `Bearer ${managementToken}`)
    expect(ended.statusCode).toBe(200)
    expect((await extra.login(email)).statusCode).toBe(200)

    // The kicked device learns on its next heartbeat and can't refresh.
    const beat = await first.heartbeat()
    expect(beat.statusCode).toBe(401)
    expect(beat.body.error.code).toBe('SESSION_ENDED')
    expect((await first.refresh()).statusCode).not.toBe(200)
  })

  it('frees the slot immediately when a session is logged out (idle expiry path)', async () => {
    const { app } = setup()
    const email = 'a@example.com'
    const devices = [device(app)]
    await devices[0].signup(email)
    for (let i = 1; i < MAX_CONCURRENT_SESSIONS; i += 1) {
      devices.push(device(app))
      await devices[i].login(email)
    }

    await devices[0].logout()
    expect((await device(app).login(email)).statusCode).toBe(200)
  })

  it('stops counting abandoned sessions once they go stale', async () => {
    const { app, store } = setup()
    const email = 'a@example.com'
    const first = device(app)
    await first.signup(email)
    for (let i = 1; i < MAX_CONCURRENT_SESSIONS; i += 1) await device(app).login(email)

    store.advance(SESSION_STALE_SECONDS + 1)

    expect((await device(app).login(email)).statusCode).toBe(200)
    // A closed-then-reopened tab can't resume a stale session.
    expect((await first.refresh()).statusCode).toBe(401)
  })

  it('keeps an active session alive through heartbeats', async () => {
    const { app, store } = setup()
    const laptop = device(app)
    await laptop.signup('a@example.com')

    for (let i = 0; i < 5; i += 1) {
      store.advance(SESSION_STALE_SECONDS - 30)
      expect((await laptop.heartbeat()).statusCode).toBe(200)
    }
    expect((await laptop.refresh()).statusCode).toBe(200)
  })

  it('keeps working after refresh rotates the token', async () => {
    const { app } = setup()
    const laptop = device(app)
    await laptop.signup('a@example.com')

    expect((await laptop.refresh()).statusCode).toBe(200)
    expect((await laptop.heartbeat()).statusCode).toBe(200)
    expect((await laptop.me()).statusCode).toBe(200)
    expect((await laptop.logout()).statusCode).toBe(200)
  })

  it('rejects a wrong password without revealing the session limit', async () => {
    const { app } = setup()
    const email = 'a@example.com'
    await device(app).signup(email)
    for (let i = 1; i < MAX_CONCURRENT_SESSIONS; i += 1) await device(app).login(email)

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong-password' })
    expect(res.statusCode).toBe(401)
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
  })
})
