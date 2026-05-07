const request = require('supertest')
const { createApp } = require('../src/app')

describe('Phase 1 auth flow', () => {
  it('supports signup, protected route access, token refresh rotation and logout', async () => {
    const { app } = createApp({
      jwtSecret: 'test-jwt-secret',
      refreshTokenSecret: 'test-refresh-secret',
    })

    const agent = request.agent(app)

    const signupRes = await agent.post('/api/v1/auth/signup').send({
      name: 'Vault Tester',
      email: 'tester@example.com',
      password: 'supersafe123',
    })

    expect(signupRes.statusCode).toBe(201)
    expect(signupRes.body.success).toBe(true)
    expect(signupRes.body.data.accessToken).toBeTypeOf('string')

    const accessToken = signupRes.body.data.accessToken

    const meRes = await agent.get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`)
    expect(meRes.statusCode).toBe(200)
    expect(meRes.body.data.user.email).toBe('tester@example.com')

    const refreshRes = await agent.post('/api/v1/auth/refresh')
    expect(refreshRes.statusCode).toBe(200)
    expect(refreshRes.body.data.accessToken).toBeTypeOf('string')

    const logoutRes = await agent.post('/api/v1/auth/logout')
    expect(logoutRes.statusCode).toBe(200)

    const refreshAfterLogout = await agent.post('/api/v1/auth/refresh')
    expect(refreshAfterLogout.statusCode).toBe(401)
  })

  it('limits auth endpoints to 5 requests per minute per IP', async () => {
    const { app } = createApp({
      jwtSecret: 'test-jwt-secret',
      refreshTokenSecret: 'test-refresh-secret',
    })

    for (let index = 0; index < 5; index += 1) {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'missing@example.com',
        password: 'supersafe123',
      })
      expect([400, 401]).toContain(response.statusCode)
    }

    const limited = await request(app).post('/api/v1/auth/login').send({
      email: 'missing@example.com',
      password: 'supersafe123',
    })

    expect(limited.statusCode).toBe(429)
    expect(limited.body.error.code).toBe('RATE_LIMITED')
  })
})
