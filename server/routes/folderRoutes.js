import { Router } from 'express'
import { getFolders, patchFolder, postFolder } from '../controllers/folderController.js'

const router = Router()

router.get('/', getFolders)
router.post('/', postFolder)
router.patch('/:id', patchFolder)

export default router
