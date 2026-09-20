import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vzjahhauiaucaxnksmze.supabase.co'
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6amFoaGF1aWF1Y2F4bmtzbXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MDk1NTgsImV4cCI6MjEwNTM4NTU1OH0.wqExPEX2Eeu8mQFLtyyV1rACcYOIcFWfsGnLjBnnuSw'

  return createBrowserClient(url, key)
}

