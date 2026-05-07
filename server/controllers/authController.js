import { supabase } from '../db/supabaseClient.js'

export async function signup(req, res) {
  if (!supabase) return res.status(503).json({ message: 'Supabase not configured' })
  const { email, password } = req.body
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return res.status(400).json({ message: error.message })
  return res.status(201).json(data)
}

export async function login(req, res) {
  if (!supabase) return res.status(503).json({ message: 'Supabase not configured' })
  const { email, password } = req.body
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return res.status(400).json({ message: error.message })
  return res.json(data)
}
