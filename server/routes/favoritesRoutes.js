import { Router } from 'express'
import { getFavorites } from '../controllers/favoritesController.js'

const router = Router()

router.get('/', getFavorites)

export default router
