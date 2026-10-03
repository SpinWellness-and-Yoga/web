import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { api, RequestError } from './request';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
test('a successful response without data cannot report a saved change', async () => {
 globalThis.fetch = async () => new Response(JSON.stringify({ success: true }), { status: 200 });
 await assert.rejects(api('/api/admin/posts'), (error: unknown) => error instanceof RequestError && error.status === 502);
});
test('a version conflict preserves the server status and message', async () => {
 globalThis.fetch = async () => new Response(JSON.stringify({ error: 'This post changed.' }), { status: 409 });
 await assert.rejects(api('/api/admin/posts/post-id'), (error: unknown) => error instanceof RequestError && error.status === 409 && error.message === 'This post changed.');
});
test('uploads retain the browser multipart boundary', async () => {
 const body = new FormData(); body.append('alt', 'A tree');
 globalThis.fetch = async (_input, options) => { assert.equal(new Headers(options?.headers).has('Content-Type'), false); assert.equal(options?.body, body); assert.equal(options?.cache, 'no-store'); return new Response(JSON.stringify({ data: { id: 'asset' } })); };
 assert.deepEqual(await api('/api/admin/media', { method: 'POST', body }), { id: 'asset' });
});
test('an invalid server error does not expose response content', async () => {
 globalThis.fetch = async () => new Response('internal server detail', { status: 500 });
 await assert.rejects(api('/api/admin/posts'), (error: unknown) => error instanceof RequestError && !error.message.includes('internal server detail'));
});
test('JSON writes set the content type and return confirmed data', async () => {
 globalThis.fetch = async (_input, options) => { assert.equal(new Headers(options?.headers).get('Content-Type'), 'application/json'); return new Response(JSON.stringify({ data: { version: 2 } })); };
 assert.deepEqual(await api('/api/admin/posts/id', { method: 'PATCH', body: JSON.stringify({ version: 1 }) }), { version: 2 });
});
