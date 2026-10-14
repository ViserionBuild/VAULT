const API_ROOT = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'}/v1`

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find((cookieEntry) => cookieEntry.startsWith(`${name}=`))
    ?.split('=')[1]
}

const CSRF_KEY = 'vault-csrf-token'

// The API sets the CSRF cookie on its own domain, which document.cookie can't
// read when the frontend is hosted elsewhere, so the token from the auth
// response body is kept here instead.
export function setCsrfToken(token) {
  if (token) {
    localStorage.setItem(CSRF_KEY, token)
  } else {
    localStorage.removeItem(CSRF_KEY)
  }
}

export async function apiRequest(path, { token, body, method = 'GET' } = {}) {
  const csrfToken = localStorage.getItem(CSRF_KEY) ?? getCookie('vault_csrf_token')

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
    error.code = payload?.error?.code
    // Callers need this for structured errors such as SESSION_LIMIT_REACHED,
    // which carries the active session list.
    error.details = payload?.error?.details
    throw error
  }

  return payload.data
}
