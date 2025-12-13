import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // prioritize service role key (bypasses RLS) over anon key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (typeof window === 'undefined') {
      console.log('[supabase] client not initialized - missing credentials');
      console.log('[supabase] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
      console.log('[supabase] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing');
      console.log('[supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing');
    }
    return null;
  }

  try {
    const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    if (typeof window === 'undefined') {
      console.log('[supabase] client initialized', usingServiceRole ? 'with SERVICE_ROLE_KEY (bypasses RLS)' : 'with ANON_KEY (subject to RLS)');
    }
    
    return supabaseClient;
  } catch (error) {
    console.error('[supabase] failed to create client:', error);
    return null;
  }
}

