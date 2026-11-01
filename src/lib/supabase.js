import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Please copy .env.example to .env and fill in your credentials.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

// The GitHub username of the site owner.
// This is used to check if the current logged-in user is the owner.
export const SITE_OWNER = 'HDF113'

// Storage bucket names
export const BUCKETS = {
  ARTICLES: 'articles',
  PROJECTS: 'projects',
  FILES: 'files',
}
