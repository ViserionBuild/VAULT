import { useCallback, useState } from 'react'
import { apiRequest } from '../lib/api'
import { useAuth } from '../contexts/auth-context'

/** Thin helper so every hook can make authed API calls */
export function useApi() {
  const { accessToken } = useAuth()

  const api = useCallback(
    (path, opts = {}) => apiRequest(path, { ...opts, token: accessToken }),
    [accessToken],
  )

  return api
}

/** Generic mutation hook with loading/error state */
export function useMutation(mutationFn) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(
    async (...args) => {
      setLoading(true)
      setError(null)
      try {
        const result = await mutationFn(...args)
        return result
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [mutationFn],
  )

  return { mutate, loading, error }
}
