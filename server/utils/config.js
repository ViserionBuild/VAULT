import dotenv from 'dotenv'

dotenv.config()

export const config = {
  appName: process.env.APP_NAME || 'Dragonstone',
  port: Number(process.env.PORT || 4000),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
}
