require('dotenv').config()
const { createApp } = require('./app')
const port = Number(process.env.PORT || 4000)

async function logDbMappingCheck(store) {
  try {
    const users = await store.listUsersRaw({ limit: 25 })
    const sanitized = users.map(({ password_hash, ...safe }) => safe)
    // eslint-disable-next-line no-console
    console.log(`[vault-backend] db mapping ok: users=${users.length}`)
    // eslint-disable-next-line no-console
    console.log('[vault-backend] users (sanitized):', sanitized)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[vault-backend] db mapping check failed:', error.message)
  }
}

const { app, store } = createApp()

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[vault-backend] listening on ${port} (supabase)`)
  if (process.env.NODE_ENV !== 'production') {
    void logDbMappingCheck(store)
  }
})
