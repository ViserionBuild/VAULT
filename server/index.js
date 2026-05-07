import express from 'express'
import cors from 'cors'
import { config } from './utils/config.js'
import { authMiddleware } from './middleware/authMiddleware.js'
import authRoutes from './routes/authRoutes.js'
import folderRoutes from './routes/folderRoutes.js'
import blockRoutes from './routes/blockRoutes.js'
import searchRoutes from './routes/searchRoutes.js'
import favoritesRoutes from './routes/favoritesRoutes.js'
import trashRoutes from './routes/trashRoutes.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', appName: config.appName })
})

app.use('/api/auth', authRoutes)
app.use('/api/folders', authMiddleware, folderRoutes)
app.use('/api/blocks', authMiddleware, blockRoutes)
app.use('/api/search', authMiddleware, searchRoutes)
app.use('/api/favorites', authMiddleware, favoritesRoutes)
app.use('/api/trash', authMiddleware, trashRoutes)

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`${config.appName} API running on ${config.port}`)
})
