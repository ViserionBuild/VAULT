import { createBlock, listBlocks, updateBlock } from '../services/workspaceService.js'

export function getBlocks(req, res) {
  res.json(listBlocks(req.user.id))
}

export function postBlock(req, res) {
  res.status(201).json(createBlock(req.user.id, req.body))
}

export function patchBlock(req, res) {
  const block = updateBlock(req.user.id, req.params.id, req.body)
  if (!block) return res.status(404).json({ message: 'Block not found' })
  return res.json(block)
}
