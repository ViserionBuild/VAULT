export function fetchTodoLists(api, { sortBy, sortOrder }) {
  const params = new URLSearchParams({ sortBy, sortOrder })
  return api(`/todo/lists?${params}`)
}

export function fetchTodoTasks(api, listId) {
  return api(`/todo/lists/${listId}/tasks`)
}

export function createTodoList(api, payload) {
  return api('/todo/lists', { method: 'POST', body: payload })
}

export function updateTodoList(api, listId, payload) {
  return api(`/todo/lists/${listId}`, { method: 'PATCH', body: payload })
}

export function deleteTodoList(api, listId) {
  return api(`/todo/lists/${listId}`, { method: 'DELETE' })
}

export function createTodoTask(api, listId, payload) {
  return api(`/todo/lists/${listId}/tasks`, { method: 'POST', body: payload })
}

export function updateTodoTask(api, taskId, payload) {
  return api(`/todo/tasks/${taskId}`, { method: 'PATCH', body: payload })
}

export function deleteTodoTask(api, taskId) {
  return api(`/todo/tasks/${taskId}`, { method: 'DELETE' })
}
