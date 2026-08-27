import { useCallback, useState } from 'react'
import { useAuth } from '../contexts/auth-context'

/**
 * Thin helper so every hook can make authed API calls. Delegates to
 * authedRequest, which refreshes and replays on an expired access token.
 */
export function useApi() {
  const { authedRequest } = useAuth()

  const api = useCallback((path, opts = {}) => authedRequest(path, opts), [authedRequest])

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
