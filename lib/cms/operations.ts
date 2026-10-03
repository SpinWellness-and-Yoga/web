import { z } from 'zod';
import type { CmsEvent, Post } from './types';
import { requireEditor, consumeRateLimit } from './auth';
import { CmsError, assertSameOrigin, readJson } from './http';
import { eventSchema, postSchema, versionSchema, identifier } from './validation';
export type Collection = 'posts' | 'events';
export async function adminContext(request: Request) {
  if (request.method !== 'GET') assertSameOrigin(request);
  const context = await requireEditor(request);
  await consumeRateLimit(`editor:${context.user.id}`, 120, 60);
  return context;
}
export function databaseError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === '40001') throw new CmsError(409, 'This record changed. Reload it before saving.');
  if (error.code === '23505') throw new CmsError(409, 'This address is already in use.');
  if (error.code === '23514' || error.code === '22023') throw new CmsError(400, 'Check the supplied fields.');
  if (error.code === '42501') throw new CmsError(403, 'Editor access is required.');
  throw new CmsError(503, 'Unable to complete this operation.');
}
export function listRange(request: Request) {
  const params = new URL(request.url).searchParams;
  const limit = z.coerce.number().int().min(1).max(100).parse(params.get('limit') ?? 50);
  const offset = z.coerce.number().int().min(0).max(1000000).parse(params.get('offset') ?? 0);
  return { start: offset, end: offset + limit - 1 };
}
export async function listRecords(request: Request, kind: Collection, id?: string) {
  const { client } = await adminContext(request);
  const table = kind === 'posts' ? 'blog_posts' : 'events';
  const range = listRange(request);
  let query = client.from(table).select(kind === 'events' ? '*,event_registrations(count)' : '*').order('updated_at', { ascending: false }).order('id').range(range.start, range.end);
  if (id) query = query.eq('id', identifier.parse(id));
  const params = new URL(request.url).searchParams;
  const term = (params.get('q') || '').slice(0,100).replace(/[^\p{L}\p{N} -]/gu, '').trim();
  if (term && kind === 'posts') query = query.or(`title.ilike.%${term}%,category.ilike.%${term}%`);
  if (term && kind === 'events') query = query.ilike('name', `%${term}%`);
  const status = params.get('status');
  if (kind === 'posts' && status && status !== 'all') query = query.eq('status', z.enum(['draft','published','archived']).parse(status));
  const { data, error } = await query;
  databaseError(error);
  const rows = (data || []) as unknown as (Post | (CmsEvent & { event_registrations?: { count: number }[] }))[];
  const records = rows.map(row => {
    if (kind === 'posts') return row;
    const { event_registrations, ...event } = row as CmsEvent & { event_registrations?: { count: number }[] };
    return { ...event, locations: event.locations && typeof event.locations !== 'string' ? JSON.stringify(event.locations) : event.locations, registration_count: event_registrations?.[0]?.count || 0 };
  });
  if (id && !records[0]) throw new CmsError(404, 'Record not found.');
  return id ? records[0] : records;
}
export async function saveRecord(request: Request, kind: Collection, id?: string) {
  const { client } = await adminContext(request);
  const raw = z.record(z.string(), z.unknown()).parse(await readJson(request));
  const { version, id: suppliedId, ...fields } = raw;
  const expected = id ? versionSchema.min(1).parse(version) : 0;
  const recordId = id ? identifier.parse(id) : kind === 'events' ? identifier.parse(suppliedId) : crypto.randomUUID();
  const payload = kind === 'posts' ? postSchema.parse(fields) : eventSchema.parse(fields);
  const { data, error } = await client.rpc('cms_save', { collection_name: kind, record_id: recordId, expected_version: expected, payload });
  databaseError(error);
  return kind === 'events' ? { ...data, locations: data.locations && typeof data.locations !== 'string' ? JSON.stringify(data.locations) : data.locations, registration_count: data.registration_count || 0 } : data;
}
