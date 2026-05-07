import { listTrash } from '../services/workspaceService.js'

export function getTrash(req, res) {
  res.json(listTrash(req.user.id))
}
