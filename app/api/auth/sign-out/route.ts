import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/cms/auth';
import { cmsClient } from '@/lib/cms/client';
import { assertSameOrigin, handle, json } from '@/lib/cms/http';
export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const value = (await cookies()).get(SESSION_COOKIE)?.value;
    if (value) await cmsClient(true).auth.admin.signOut(value, 'local');
    const response = json({ signed_out: true });
    response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
    return response;
  });
}
