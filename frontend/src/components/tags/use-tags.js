import { useCallback, useEffect, useState } from 'react'
import { useApi } from '../../hooks/use-api'

/** The user's tags (with item counts), plus create. */
export function useTags() {
  const api = useApi()
  const [tags, setTags] = useState([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const data = await api('/tags')
    setTags(data ?? [])
    setLoaded(true)
    return data ?? []
  }, [api])

  useEffect(() => {
    queueMicrotask(() => {
      refresh().catch(() => setLoaded(true))
    })
  }, [refresh])

  const createTag = useCallback(
    async (name, color) => {
      const tag = await api('/tags', { method: 'POST', body: { name, color } })
      setTags((prev) => [...prev, { ...tag, itemCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)))
      return tag
    },
    [api],
  )

  return { tags, setTags, loaded, refresh, createTag }
}
