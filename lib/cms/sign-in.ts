import { cmsClient } from './client';
import { consumeRateLimit, SESSION_COOKIE } from './auth';
import { assertSameOrigin, CmsError, json, readJson } from './http';
import { emailSchema, verifySchema } from './validation';
export async function requestCode(request: Request) {
  assertSameOrigin(request);
  const { email } = emailSchema.parse(await readJson(request));
  await consumeRateLimit('auth:global:send', 100, 60);
  await consumeRateLimit(`auth:send:${email}`, 3, 900);
  const allowed = await cmsClient(true)
    .from('website_allowed_emails')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (allowed.data) {
    const siteUrl = process.env.CMS_SITE_URL || 'https://spinwellness.org';
    const { error } = await cmsClient().auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${siteUrl}/admin/login`,
      },
    });
    if (error && error.status && error.status >= 500) throw new CmsError(503, 'Sign-in is unavailable.');
  }
  return json({ message: 'If your account has access, a sign-in link or code will arrive by email.' });
}
export async function verifyCode(request: Request) {
  assertSameOrigin(request);
  const input = verifySchema.parse(await readJson(request));
  let token: string;
  let expiresAt: number;
  await consumeRateLimit('auth:global:verify', 200, 60);
  if ('accessToken' in input) {
    token = input.accessToken;
    expiresAt = Math.floor(Date.now() / 1000) + 3600;
  } else {
    await consumeRateLimit(`auth:verify:${input.email}`, 8, 900);
    const { data, error } = await cmsClient().auth.verifyOtp({ ...input, type: 'email' });
    if (error || !data.session) throw new CmsError(401, 'The code is invalid or expired.');
    token = data.session.access_token;
    expiresAt = data.session.expires_at || (Math.floor(Date.now() / 1000) + 3600);
  }
  const client = cmsClient(false, token);
  const current = await client.auth.getUser(token);
  if (current.error || !current.data.user) throw new CmsError(401, 'Sign in to continue.');
  const userEmail = current.data.user.email?.toLowerCase();
  const member = await client.from('website_editors').select('user_id').eq('user_id', current.data.user.id).eq('active', true).maybeSingle();
  let isEditor = Boolean(member.data);
  if (!isEditor && userEmail) {
    const isAllowed = await cmsClient(true).from('website_allowed_emails').select('email').eq('email', userEmail).maybeSingle();
    if (isAllowed.data) {
      await cmsClient(true).from('website_editors').upsert({ user_id: current.data.user.id, active: true });
      isEditor = true;
    }
  }
  if (!isEditor) throw new CmsError(403, 'Editor access is required.');
  const lifetime = Math.max(0, Math.min(3600, expiresAt - Math.floor(Date.now() / 1000)));
  const response = json({ email: current.data.user.email, expires_at: new Date(Date.now() + lifetime * 1000).toISOString() });
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: lifetime });
  return response;
}
