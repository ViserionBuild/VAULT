import { Router } from 'express'
import { getSearch } from '../controllers/searchController.js'

const router = Router()

router.get('/', getSearch)

export default router
