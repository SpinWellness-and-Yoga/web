import { createClient } from '@supabase/supabase-js';
import { CmsError } from './http';
export function cmsClient(service = false, accessToken?: string) {
  if (typeof window !== 'undefined') throw new Error('Server access required.');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = service ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new CmsError(503, 'Website editing is not configured.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }), ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}) },
  });
}
