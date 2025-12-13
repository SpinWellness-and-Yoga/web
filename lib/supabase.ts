import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[supabase] missing supabase credentials');
  console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.warn('[supabase] Key available:', !!supabaseKey);
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export function getSupabaseClient() {
  if (!supabase) {
    console.warn('[supabase] client not initialized - check environment variables');
    console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing');
    console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing');
  }
  return supabase;
}

