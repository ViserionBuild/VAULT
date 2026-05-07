import { Router } from 'express'
import { getTrash } from '../controllers/trashController.js'

const router = Router()

router.get('/', getTrash)

export default router
