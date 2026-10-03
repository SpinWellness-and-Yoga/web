import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { cmsClient } from './client';
import { CmsError } from './http';
export const SESSION_COOKIE = 'sway-editor';
export async function requireEditor(request?: Request) {
  const accessToken = request ? new NextRequest(request.url, { headers: request.headers }).cookies.get(SESSION_COOKIE)?.value : (await cookies()).get(SESSION_COOKIE)?.value;
  if (!accessToken) throw new CmsError(401, 'Sign in to continue.');
  const client = cmsClient(false, accessToken);
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) throw new CmsError(401, 'Sign in to continue.');
  const membership = await client.from('website_editors').select('user_id').eq('user_id', data.user.id).eq('active', true).maybeSingle();
  if (membership.error) throw new CmsError(503, 'Unable to check editor access.');
  if (!membership.data) throw new CmsError(403, 'Editor access is required.');
  return { client, user: data.user };
}
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  const hash = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  const { data, error } = await cmsClient(true).rpc('cms_rate_limit', { bucket_key: hash, max_requests: limit, window_seconds: windowSeconds });
  if (error) throw new CmsError(503, 'Service is unavailable. Try again later.');
  if (!data) throw new CmsError(429, 'Too many requests. Try again later.');
}
