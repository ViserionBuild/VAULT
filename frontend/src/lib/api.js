const API_ROOT = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'}/v1`

export async function apiRequest(path, { token, body, method = 'GET' } = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json()

  if (!response.ok) {
    const error = new Error(payload?.error?.message ?? 'Request failed')
    error.status = response.status
    throw error
  }

  return payload.data
}
