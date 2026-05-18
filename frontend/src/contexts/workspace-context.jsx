import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './auth-context'
import { apiRequest } from '../lib/api'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const { accessToken, isAuthenticated, ready } = useAuth()
  const [workspaces, setWorkspaces] = useState([])
  const [activeWorkspace, setActiveWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)

  const api = useCallback(
    (path, opts = {}) => apiRequest(path, { ...opts, token: accessToken }),
    [accessToken],
  )

  const fetchWorkspaces = useCallback(async () => {
    if (!accessToken) return
    try {
      setLoading(true)
      const data = await api('/workspaces')
      setWorkspaces(data)
      if (data.length > 0) {
        const defaultWs = data.find((w) => w.isDefault) ?? data[0]
        setActiveWorkspace((prev) => {
          // Keep current selection if it still exists
          if (prev && data.some((w) => w.id === prev.id)) return prev
          return defaultWs
        })
      }
    } catch {
      // ignore — token may be stale
    } finally {
      setLoading(false)
    }
  }, [api, accessToken])

  // Re-fetch when auth state changes
  useEffect(() => {
    if (!ready) {
      return
    }

    if (isAuthenticated) {
      fetchWorkspaces()
    } else {
      setWorkspaces([])
      setActiveWorkspace(null)
      setLoading(false)
    }
  }, [isAuthenticated, ready, accessToken, fetchWorkspaces])

  const createWorkspace = useCallback(
    async (payload) => {
      const ws = await api('/workspaces', { method: 'POST', body: payload })
      setWorkspaces((prev) => [...prev, ws])
      return ws
    },
    [api],
  )

  const switchWorkspace = useCallback(
    (ws) => {
      setActiveWorkspace(ws)
    },
    [],
  )

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, activeWorkspace, loading, switchWorkspace, createWorkspace, fetchWorkspaces }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
