import { createFolder, listFolders, updateFolder } from '../services/workspaceService.js'

export function getFolders(req, res) {
  res.json(listFolders(req.user.id))
}

export function postFolder(req, res) {
  res.status(201).json(createFolder(req.user.id, req.body))
}

export function patchFolder(req, res) {
  const folder = updateFolder(req.user.id, req.params.id, req.body)
  if (!folder) return res.status(404).json({ message: 'Folder not found' })
  return res.json(folder)
}
