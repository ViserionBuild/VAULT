require('dotenv').config()
const { createApp } = require('./app')
const { createSupabaseClient } = require('./supabase')

const port = Number(process.env.PORT || 4000)
const supabase = createSupabaseClient()

const { app } = createApp()

app.listen(port, () => {
  const backendMode = supabase ? 'supabase-connected' : 'local-mode'
  // eslint-disable-next-line no-console
  console.log(`[vault-backend] listening on ${port} (${backendMode})`)
})
