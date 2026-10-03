import test from 'node:test';
import assert from 'node:assert/strict';
import { SESSION_COOKIE } from '../../lib/cms/auth';
import { GET as list } from '../../app/api/admin/drive/route';
import { POST as start } from '../../app/api/admin/drive/files/route';
import { PUT as part, POST as complete, PATCH as update, DELETE as remove } from '../../app/api/admin/drive/files/[id]/route';
import { GET as download } from '../../app/files/[id]/route';
import { GET as shared } from '../../app/share/[token]/route';
const origin = 'https://website.example.invalid';
const provider = 'https://database.example.invalid';
type Row = Record<string, unknown>;
// a small stand-in for the database REST interface: equality and null filters only.
function matches(row: Row, params: URLSearchParams) {
  for (const [key, filter] of params) {
    if (key === 'select' || key === 'order' || key === 'limit') continue;
    if (filter === 'is.null' && row[key] !== null) return false;
    if (filter.startsWith('eq.') && String(row[key]) !== filter.slice(3)) return false;
  }
  return true;
}
test('Drive uploads need an administrator, keep private files private, and share by token', async () => {
  const savedEnv = { ...process.env }; const originalFetch = globalThis.fetch;
  const cfSymbol = Symbol.for('__cloudflare-context__'); const originalCf = (globalThis as any)[cfSymbol];
  const objects = new Map<string, Uint8Array>(); const pending = new Map<string, Uint8Array[]>(); let aborted = 0;
  const upload = (key: string, uploadId: string) => ({
    uploadId,
    async uploadPart(partNumber: number, value: Uint8Array) { pending.get(uploadId)![partNumber - 1] = value; return { partNumber, etag: `etag-${partNumber}` }; },
    async complete() { const bytes = Buffer.concat(pending.get(uploadId)!); objects.set(key, bytes); return { size: bytes.length }; },
    async abort() { aborted++; pending.delete(uploadId); },
  });
  (globalThis as any)[cfSymbol] = { env: { CMS_MEDIA: {
    async createMultipartUpload(key: string) { const id = crypto.randomUUID(); pending.set(id, []); return upload(key, id); },
    resumeMultipartUpload: upload,
    async get(key: string, options?: { range: Headers }) {
      const bytes = objects.get(key); if (!bytes) return null;
      const offset = options ? Number(options.range.get('range')!.match(/bytes=(\d+)-/)![1]) : 0;
      return { body: new Response(bytes.subarray(offset) as BodyInit).body, size: bytes.length, httpEtag: '"e"', ...(options ? { range: { offset, length: bytes.length - offset } } : {}) };
    },
    async delete(key: string) { objects.delete(key); },
  } } };
  Object.assign(process.env, { CMS_SITE_URL: origin, NEXT_PUBLIC_SUPABASE_URL: provider, NEXT_PUBLIC_SUPABASE_ANON_KEY: crypto.randomUUID(), SUPABASE_SERVICE_ROLE_KEY: crypto.randomUUID() });
  const userId = crypto.randomUUID(); let role = 'admin'; const files: Row[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    assert.equal(url.origin, provider);
    const reply = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
    if (url.pathname === '/auth/v1/user') return reply({ id: userId, email: 'admin@example.invalid', aud: 'authenticated' });
    if (url.pathname === '/rest/v1/website_editors') return reply([{ user_id: userId }]);
    if (url.pathname === '/rest/v1/website_allowed_emails') return reply([{ role }]);
    if (url.pathname === '/rest/v1/rpc/drive_usage') return reply(files.reduce((sum, row) => sum + Number(row.size), 0));
    if (url.pathname === '/rest/v1/drive_folders') return reply([]);
    if (url.pathname !== '/rest/v1/drive_files') return reply(true);
    const method = init?.method || 'GET';
    if (method === 'POST') { files.push({ folder_id: null, visibility: 'private', share_token: null, created_at: new Date().toISOString(), ...JSON.parse(String(init?.body)) }); return reply(null); }
    const found = files.filter(row => matches(row, url.searchParams));
    if (method === 'PATCH') for (const row of found) Object.assign(row, JSON.parse(String(init?.body)));
    if (method === 'DELETE') for (const row of found) files.splice(files.indexOf(row), 1);
    const columns = url.searchParams.get('select');
    const rows = !columns || columns === '*' ? found : found.map(row => Object.fromEntries(columns.split(',').map(column => [column, row[column]])));
    return reply(new Headers(init?.headers).get('accept')?.includes('pgrst.object') ? rows[0] : rows);
  };
  const cookie = `${SESSION_COOKIE}=${crypto.randomUUID()}`;
  const send = (method: string, path: string, body?: unknown, raw?: Uint8Array) => new Request(`${origin}${path}`, { method, headers: { origin, cookie, 'content-type': 'application/json' }, ...(raw ? { body: raw as BodyInit } : body ? { body: JSON.stringify(body) } : {}) });
  const context = (id: string) => ({ params: Promise.resolve({ id }) });
  const content = new TextEncoder().encode('sway drive file');
  const input = { name: 'guide.pdf', size: content.length, content_type: 'application/pdf', folder_id: null };
  try {
    role = 'editor';
    assert.equal((await start(send('POST', '/api/admin/drive/files', input))).status, 403);
    role = 'admin';
    assert.equal((await start(send('POST', '/api/admin/drive/files', { ...input, size: 10 * 1024 ** 3 + 1 }))).status, 400);
    process.env.DRIVE_LIMIT_BYTES = '10';
    assert.equal((await start(send('POST', '/api/admin/drive/files', input))).status, 413);
    delete process.env.DRIVE_LIMIT_BYTES;
    const { id, part_size } = (await (await start(send('POST', '/api/admin/drive/files', input))).json()).data;
    assert.equal(part_size, 16 * 1024 * 1024);
    // an open upload is hidden and cannot be downloaded.
    assert.equal((await (await list(send('GET', '/api/admin/drive'))).json()).data.files.length, 0);
    assert.equal((await download(send('GET', `/files/${id}`), context(id))).status, 404);
    const stored = (await (await part(send('PUT', `/api/admin/drive/files/${id}?part=1`, undefined, content), context(id))).json()).data;
    assert.deepEqual(stored, { partNumber: 1, etag: 'etag-1' });
    assert.equal((await complete(send('POST', `/api/admin/drive/files/${id}`, { parts: [stored] }), context(id))).status, 200);
    assert.equal((await part(send('PUT', `/api/admin/drive/files/${id}?part=2`, undefined, content), context(id))).status, 409);
    const listing = (await (await list(send('GET', '/api/admin/drive'))).json()).data;
    assert.equal(listing.files.length, 1); assert.equal(listing.usage, content.length); assert.equal(listing.can_write, true);
    assert.equal(listing.files[0].object_key, undefined);

    const anonymous = new Request(`${origin}/files/${id}`);
    assert.equal((await download(anonymous, context(id))).status, 401);
    const own = await download(send('GET', `/files/${id}`), context(id));
    assert.equal(await own.text(), 'sway drive file');
    assert.equal(own.headers.get('cache-control'), 'private, no-store');
    const ranged = await download(new Request(`${origin}/files/${id}`, { headers: { cookie, range: 'bytes=5-' } }), context(id));
    assert.equal(ranged.status, 206); assert.equal(await ranged.text(), 'drive file');
    assert.equal(ranged.headers.get('content-range'), `bytes 5-${content.length - 1}/${content.length}`);

    const token = (await (await update(send('PATCH', `/api/admin/drive/files/${id}`, { shared: true }), context(id))).json()).data.share_token;
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(await (await shared(new Request(`${origin}/share/${token}`), { params: Promise.resolve({ token }) })).text(), 'sway drive file');
    await update(send('PATCH', `/api/admin/drive/files/${id}`, { shared: false }), context(id));
    assert.equal((await shared(new Request(`${origin}/share/${token}`), { params: Promise.resolve({ token }) })).status, 404);
    await update(send('PATCH', `/api/admin/drive/files/${id}`, { visibility: 'public' }), context(id));
    assert.equal((await download(anonymous, context(id))).status, 200);

    // a size mismatch removes the stored object and the record.
    const short = (await (await start(send('POST', '/api/admin/drive/files', { ...input, size: content.length + 1 }))).json()).data.id;
    const shortPart = (await (await part(send('PUT', `/api/admin/drive/files/${short}?part=1`, undefined, content), context(short))).json()).data;
    assert.equal((await complete(send('POST', `/api/admin/drive/files/${short}`, { parts: [shortPart] }), context(short))).status, 400);
    assert.equal(files.length, 1); assert.equal(objects.size, 1);

    const open = (await (await start(send('POST', '/api/admin/drive/files', input))).json()).data.id;
    assert.equal((await remove(send('DELETE', `/api/admin/drive/files/${open}`), context(open))).status, 200);
    assert.equal(aborted, 1);
    role = 'editor';
    assert.equal((await remove(send('DELETE', `/api/admin/drive/files/${id}`), context(id))).status, 403);
    role = 'admin';
    assert.equal((await remove(send('DELETE', `/api/admin/drive/files/${id}`), context(id))).status, 200);
    assert.equal(files.length, 0); assert.equal(objects.size, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalCf !== undefined) (globalThis as any)[cfSymbol] = originalCf; else delete (globalThis as any)[cfSymbol];
    for (const key of ['CMS_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
      if (savedEnv[key]) process.env[key] = savedEnv[key]; else delete process.env[key];
    }
  }
});
