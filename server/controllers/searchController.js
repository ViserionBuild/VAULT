import { searchWorkspace } from '../services/workspaceService.js'

export function getSearch(req, res) {
  res.json(searchWorkspace(req.user.id, req.query.q || ''))
}
