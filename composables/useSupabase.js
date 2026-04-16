// composables/useSupabase.js
// Frontend Supabase client — uses publishable key, safe for browser

import { createClient } from '@supabase/supabase-js'

let _client = null

export function useSupabase() {
  if (!_client) {
    const cfg = useRuntimeConfig()
    _client = createClient(
      cfg.public.supabaseUrl,
      cfg.public.supabasePublishableKey
    )
  }
  return _client
}