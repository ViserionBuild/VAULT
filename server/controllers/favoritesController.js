import { listFavorites } from '../services/workspaceService.js'

export function getFavorites(req, res) {
  res.json(listFavorites(req.user.id))
}
