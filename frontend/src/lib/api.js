const API_ROOT = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'}/v1`

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find((cookieEntry) => cookieEntry.startsWith(`${name}=`))
    ?.split('=')[1]
}

export async function apiRequest(path, { token, body, method = 'GET' } = {}) {
  const csrfToken = getCookie('vault_csrf_token')

  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
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
