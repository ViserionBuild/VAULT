import { supabase } from '../db/supabaseClient.js'

export async function authMiddleware(req, _res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token || !supabase) {
    req.user = { id: req.headers['x-user-id'] || 'demo-user' }
    return next()
  }

  const { data } = await supabase.auth.getUser(token)
  req.user = { id: data.user?.id || 'demo-user' }
  return next()
}
