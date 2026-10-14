const request = require('supertest')
const { createApp } = require('../src/app')
const { createLoginThrottle } = require('../src/middleware/login-throttle')

describe('login throttle', () => {
  it('locks an email after 5 failures in the window, then releases it', () => {
    let clock = 0
    const throttle = createLoginThrottle({ now: () => clock })
    for (let i = 0; i < 4; i += 1) throttle.recordFailure('a@example.com')
    expect(throttle.lockedFor('a@example.com')).toBe(0)
    throttle.recordFailure('a@example.com')
    expect(throttle.lockedFor('a@example.com')).toBe(15 * 60 * 1000)
    clock += 15 * 60 * 1000
    expect(throttle.lockedFor('a@example.com')).toBe(0)
  })

  it('forgets failures outside the window and on success', () => {
    let clock = 0
    const throttle = createLoginThrottle({ now: () => clock })
    for (let i = 0; i < 4; i += 1) throttle.recordFailure('a@example.com')
    clock += 16 * 60 * 1000
    throttle.recordFailure('a@example.com')
    expect(throttle.lockedFor('a@example.com')).toBe(0)
    for (let i = 0; i < 3; i += 1) throttle.recordFailure('a@example.com')
    throttle.recordSuccess('a@example.com')
    throttle.recordFailure('a@example.com')
    expect(throttle.lockedFor('a@example.com')).toBe(0)
  })
})

function memoryStore(users) {
  return {
    async findUserByEmail(email) {
      return users.find((u) => u.email === email) ?? null
    },
    async listActiveSessions() {
      return []
    },
    async storeRefreshToken() {
      return 'session-1'
    },
  }
}

describe('login route protection', () => {
  const noIpLimit = (_req, _res, next) => next()

  it('locks an account after repeated wrong passwords, even for the right one', async () => {
    const bcrypt = require('bcryptjs')
    const store = memoryStore([{ id: 'u1', name: 'A', email: 'a@example.com', passwordHash: await bcrypt.hash('rightpassword', 4) }])
    const { app } = createApp({ store, authLimiter: noIpLimit, jwtSecret: 't', refreshTokenSecret: 'r' })
    const login = (password) => request(app).post('/api/v1/auth/login').send({ email: 'a@example.com', password })

    for (let i = 0; i < 5; i += 1) expect((await login('wrongpassword')).statusCode).toBe(401)
    const locked = await login('rightpassword')
    expect(locked.statusCode).toBe(429)
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED')
    expect(locked.headers['retry-after']).toBeDefined()
  })

  it('locks unknown emails the same way, revealing nothing', async () => {
    const { app } = createApp({ store: memoryStore([]), authLimiter: noIpLimit, jwtSecret: 't', refreshTokenSecret: 'r' })
    const login = () => request(app).post('/api/v1/auth/login').send({ email: 'nobody@example.com', password: 'whatever123' })
    for (let i = 0; i < 5; i += 1) expect((await login()).statusCode).toBe(401)
    expect((await login()).body.error.code).toBe('ACCOUNT_LOCKED')
  })

  it('takes bcrypt time for unknown emails too', async () => {
    const bcrypt = require('bcryptjs')
    const store = memoryStore([{ id: 'u1', name: 'A', email: 'a@example.com', passwordHash: await bcrypt.hash('rightpassword', 12) }])
    const { app } = createApp({ store, authLimiter: noIpLimit, jwtSecret: 't', refreshTokenSecret: 'r' })
    const timed = async (email) => {
      const start = Date.now()
      await request(app).post('/api/v1/auth/login').send({ email, password: 'wrongpassword' })
      return Date.now() - start
    }
    await timed('warmup@example.com') // first call also builds the dummy hash
    const unknown = await timed('nobody@example.com')
    const wrong = await timed('a@example.com')
    expect(unknown).toBeGreaterThan(wrong * 0.5)
  })
})
