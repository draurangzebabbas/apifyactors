import { createBrowserClient } from '@supabase/ssr'

const DEFAULT_SUPABASE_URL = 'https://owpxpcnyeummhuasnayd.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cHhwY255ZXVtbWh1YXNuYXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MjI3ODEsImV4cCI6MjEwOTE5ODc4MX0.BsMz2loHDPp1_S26JkIIalrAgq7kfQlgu4Iz9OjA4_g'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
  )
}
