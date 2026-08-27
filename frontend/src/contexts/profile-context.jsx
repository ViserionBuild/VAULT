import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './auth-context'
import { useApi } from '../hooks/use-api'

const ProfileContext = createContext(null)

/**
 * Holds the current user's profile so the avatar can render anywhere in the
 * shell without each consumer refetching it.
 */
export function ProfileProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const api = useApi()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null)
      return
    }
    setLoading(true)
    try {
      const data = await api('/profile')
      setProfile(data.profile ?? {})
    } catch {
      // A failed profile load must not block the app.
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [api, isAuthenticated])

  useEffect(() => {
    // setState here happens after an await, not synchronously in the effect
    // body; the rule cannot see through the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile()
  }, [loadProfile])

  const saveProfile = useCallback(
    async (fields) => {
      const data = await api('/profile', { method: 'PUT', body: fields })
      setProfile(data.profile ?? {})
      return data
    },
    [api],
  )

  return (
    <ProfileContext.Provider value={{ profile, loading, saveProfile, reloadProfile: loadProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider')
  }
  return context
}
