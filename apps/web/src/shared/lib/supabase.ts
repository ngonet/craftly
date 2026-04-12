// Supabase browser client — singleton.
//
// Uses the ANON key (safe for the browser). The anon key is PUBLIC and
// only grants access to data that passes RLS policies. NEVER put the
// service_role key here.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — check your .env file.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist session in localStorage for offline-first.
    persistSession: true,
    // Auto-refresh token before expiry.
    autoRefreshToken: true,
    // Detect session from URL hash (magic link callback).
    detectSessionInUrl: true,
  },
});
