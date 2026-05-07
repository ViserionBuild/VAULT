import { Router } from 'express'
import { getBlocks, patchBlock, postBlock } from '../controllers/blockController.js'

const router = Router()

router.get('/', getBlocks)
router.post('/', postBlock)
router.patch('/:id', patchBlock)

export default router
