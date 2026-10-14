import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiRequest, setCsrfToken } from '../lib/api'

const respond = (status, body, contentType = 'application/json') =>
  Promise.resolve(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': contentType } }))

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('apiRequest', () => {
  it('returns the data of a successful envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(respond(200, { success: true, data: { ok: 1 } }))
    await expect(apiRequest('/x')).resolves.toEqual({ ok: 1 })
  })

  it('surfaces the server message, status and code on errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      respond(409, { success: false, error: { code: 'DUPLICATE', message: 'Already exists' } }),
    )
    await expect(apiRequest('/x')).rejects.toMatchObject({ message: 'Already exists', status: 409, code: 'DUPLICATE' })
  })

  it('explains an HTML 502 instead of failing to parse it', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(respond(502, '<html>Bad gateway</html>', 'text/html'))
    await expect(apiRequest('/x')).rejects.toThrow('The server is unavailable right now')
  })

  it('explains a plain-text rate limit', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(respond(429, 'Too many requests', 'text/plain'))
    await expect(apiRequest('/x')).rejects.toThrow('Too many requests. Please wait')
  })

  it('replaces "Failed to fetch" with a readable network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(apiRequest('/x')).rejects.toThrow("Can't reach the server")
  })

  it('sends the stored CSRF token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockReturnValue(respond(200, { data: null }))
    setCsrfToken('abc123')
    await apiRequest('/x', { method: 'POST' })
    expect(fetchSpy.mock.calls[0][1].headers['x-csrf-token']).toBe('abc123')
  })
})
