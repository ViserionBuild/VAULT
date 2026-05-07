const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message)
  }

  return response.json()
}

export const api = {
  folders: {
    list: () => request('/folders'),
    create: (payload) => request('/folders', { method: 'POST', body: JSON.stringify(payload) }),
  },
  blocks: {
    list: () => request('/blocks'),
    create: (payload) => request('/blocks', { method: 'POST', body: JSON.stringify(payload) }),
  },
  favorites: {
    list: () => request('/favorites'),
  },
  trash: {
    list: () => request('/trash'),
  },
  search: (query) => request(`/search?q=${encodeURIComponent(query)}`),
}
