import { cmsClient } from './client';
import { consumeRateLimit, SESSION_COOKIE } from './auth';
import { assertSameOrigin, CmsError, json, readJson } from './http';
import { emailSchema, verifySchema } from './validation';
export async function requestCode(request: Request) {
  assertSameOrigin(request);
  const { email } = emailSchema.parse(await readJson(request));
  await consumeRateLimit('auth:global:send', 100, 60);
  await consumeRateLimit(`auth:send:${email}`, 3, 900);
  const { error } = await cmsClient().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error && error.status && error.status >= 500) throw new CmsError(503, 'Sign-in is unavailable.');
  return json({ message: 'If your account has access, a code will arrive by email.' });
}
export async function verifyCode(request: Request) {
  assertSameOrigin(request);
  const input = verifySchema.parse(await readJson(request));
  await consumeRateLimit('auth:global:verify', 200, 60);
  await consumeRateLimit(`auth:verify:${input.email}`, 8, 900);
  const { data, error } = await cmsClient().auth.verifyOtp({ ...input, type: 'email' });
  if (error || !data.session) throw new CmsError(401, 'The code is invalid or expired.');
  const client = cmsClient(false, data.session.access_token);
  const current = await client.auth.getUser(data.session.access_token);
  if (current.error || !current.data.user) throw new CmsError(401, 'Sign in to continue.');
  const member = await client.from('website_editors').select('user_id').eq('user_id', current.data.user.id).eq('active', true).maybeSingle();
  if (member.error || !member.data) throw new CmsError(403, 'Editor access is required.');
  const lifetime = Math.max(0, Math.min(3600, (data.session.expires_at || 0) - Math.floor(Date.now() / 1000)));
  const response = json({ email: current.data.user.email, expires_at: new Date(Date.now() + lifetime * 1000).toISOString() });
  response.cookies.set(SESSION_COOKIE, data.session.access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: lifetime });
  return response;
}
