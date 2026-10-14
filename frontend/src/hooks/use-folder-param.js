import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * The open folder lives in the URL (?folder=<id>), so Back goes up a level,
 * refresh stays put, and a folder can be bookmarked or shared. Switching
 * workspace returns to the root, since another workspace's folder is empty.
 */
export function useFolderParam(workspaceId) {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentFolder = searchParams.get('folder')

  const openFolder = useCallback(
    (folderId) => setSearchParams(folderId ? { folder: folderId } : {}),
    [setSearchParams],
  )

  const workspaceIdRef = useRef(workspaceId)
  useEffect(() => {
    const previous = workspaceIdRef.current
    workspaceIdRef.current = workspaceId
    if (previous && workspaceId && previous !== workspaceId) openFolder(null)
  }, [workspaceId, openFolder])

  return { currentFolder, openFolder, searchParams, setSearchParams }
}
