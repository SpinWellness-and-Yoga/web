import { NextResponse } from 'next/server';
import { z } from 'zod';
export class CmsError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const configured = process.env.CMS_SITE_URL;
  if (!configured) throw new CmsError(503, 'Website editing is not configured.');
  if (!origin || origin !== new URL(configured).origin) throw new CmsError(403, 'Request not permitted.');
}
export async function readBytes(request: Request, limit: number): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) throw new CmsError(400, 'Request body is required.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new CmsError(413, 'Request is too large.'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new CmsError(415, 'JSON is required.');
  const bytes = await readBytes(request, 150000);
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new CmsError(400, 'Request is invalid.'); }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
export async function handle(action: () => Promise<Response>): Promise<Response> {
  try { return await action(); }
  catch (error) {
    const status = error instanceof CmsError ? error.status : error instanceof z.ZodError ? 400 : 503;
    const message = error instanceof CmsError ? error.message : status === 400 ? 'Check the supplied fields.' : 'Service is unavailable. Try again later.';
    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
