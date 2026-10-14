import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../contexts/workspace-context'

/** Host of a stored URL for display; never throws on a malformed one. */
export function hostOf(url) {
  try {
    return new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url ?? ''
  }
}

/**
 * Opens a resource or note from anywhere (dashboard, favorites, trash):
 * links in a new tab, folders and notes on their own page, switching to the
 * item's workspace first when it belongs to another one.
 */
export function useOpenItem() {
  const navigate = useNavigate()
  const { workspaces, activeWorkspace, switchWorkspace } = useWorkspace()

  return useCallback(
    (item, kind) => {
      if (kind === 'resource' && item.type !== 'folder') {
        if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer')
        return
      }
      if (item.workspaceId && activeWorkspace && String(item.workspaceId) !== String(activeWorkspace.id)) {
        const target = workspaces.find((ws) => String(ws.id) === String(item.workspaceId))
        if (target) switchWorkspace(target)
      }
      if (kind === 'resource') navigate(`/resources?folder=${item.id}`)
      else navigate(item.type === 'folder' ? `/notes?folder=${item.id}` : `/notes?note=${item.id}`)
    },
    [navigate, workspaces, activeWorkspace, switchWorkspace],
  )
}
