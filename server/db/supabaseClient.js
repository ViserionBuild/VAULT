import { createClient } from '@supabase/supabase-js'
import { config } from '../utils/config.js'

export const supabase =
  config.supabaseUrl && config.supabaseAnonKey
    ? createClient(config.supabaseUrl, config.supabaseAnonKey)
    : null

export const supabaseAdmin =
  config.supabaseUrl && config.supabaseServiceRoleKey
    ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey)
    : null
