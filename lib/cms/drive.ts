import { getCloudflareContext } from '@opennextjs/cloudflare';
import { z } from 'zod';
import { consumeRateLimit, requireEditor } from './auth';
import { cmsClient } from './client';
import { assertSameOrigin, CmsError, readBytes, readJson } from './http';

export const DRIVE_PART_SIZE = 16 * 1024 * 1024;
const MAX_FILE_SIZE = 10 * 1024 ** 3;
const DEFAULT_LIMIT = 100 * 1024 ** 3;
const FILE_FIELDS = 'id,folder_id,name,content_type,size,visibility,share_token,created_at';
const INLINE_TYPES = /^(image\/(png|jpeg|webp|gif)|video\/|audio\/|application\/pdf$)/;

interface StoredPart { partNumber: number; etag: string }
interface StoredObject { body: ReadableStream; size: number; httpEtag: string; range?: { offset?: number; length?: number } }
interface MultipartUpload {
  uploadId: string;
  uploadPart(partNumber: number, value: Uint8Array): Promise<StoredPart>;
  complete(parts: StoredPart[]): Promise<{ size: number }>;
  abort(): Promise<void>;
}
export interface DriveBucket {
  createMultipartUpload(key: string, options: { httpMetadata: { contentType: string } }): Promise<MultipartUpload>;
  resumeMultipartUpload(key: string, uploadId: string): MultipartUpload;
  get(key: string, options?: { range: Headers }): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}
interface DriveFile { id: string; folder_id: string | null; name: string; object_key: string; content_type: string; size: number; visibility: 'public' | 'private'; share_token: string | null; upload_id: string | null }

const uuid = z.uuid();
const fileName = z.string().trim().min(1).max(240).refine(value => !/[\\/\u0000-\u001f]/.test(value));
const folderSchema = z.object({ name: z.string().trim().min(1).max(120), parent_id: uuid.nullable() }).strict();
const startSchema = z.object({ name: fileName, size: z.number().int().min(1).max(MAX_FILE_SIZE), content_type: z.string().trim().max(120), folder_id: uuid.nullable() }).strict();
const partsSchema = z.object({ parts: z.array(z.object({ partNumber: z.number().int().min(1).max(10000), etag: z.string().min(1).max(200) }).strict()).min(1).max(10000) }).strict();
const updateSchema = z.object({ name: fileName, folder_id: uuid.nullable(), visibility: z.enum(['public', 'private']), shared: z.boolean() }).partial().strict();

function bucket(): DriveBucket {
  const env = getCloudflareContext().env as unknown as { CMS_MEDIA?: DriveBucket };
  if (!env.CMS_MEDIA) throw new CmsError(503, 'File storage is unavailable.');
  return env.CMS_MEDIA;
}
function limit() { return Number(process.env.DRIVE_LIMIT_BYTES) || DEFAULT_LIMIT; }
function check<T>(result: { data: T; error: { code?: string } | null }): T {
  if (result.error?.code === '23505') throw new CmsError(409, 'This name is already in use.');
  if (result.error?.code === '23503') throw new CmsError(400, 'The folder is not empty or does not exist.');
  if (result.error) throw new CmsError(503, 'The drive is unavailable. Try again later.');
  return result.data;
}
// editors can browse; only an administrator can change the drive.
async function driveContext(request: Request, write: boolean) {
  if (request.method !== 'GET') assertSameOrigin(request);
  const { user } = await requireEditor(request);
  await consumeRateLimit(`drive:${user.id}`, 900, 60);
  const db = cmsClient(true);
  const allowed = check(await db.from('website_allowed_emails').select('role').eq('email', (user.email || '').toLowerCase()).maybeSingle());
  const admin = allowed?.role === 'admin';
  if (write && !admin) throw new CmsError(403, 'Administrator access is required.');
  return { db, user, admin };
}
async function findFile(db: ReturnType<typeof cmsClient>, column: 'id' | 'share_token', value: string): Promise<DriveFile> {
  const file = check(await db.from('drive_files').select('*').eq(column, value).maybeSingle()) as DriveFile | null;
  if (!file) throw new CmsError(404, 'File not found.');
  return file;
}

export async function listDrive(request: Request) {
  const { db, admin } = await driveContext(request, false);
  const params = new URL(request.url).searchParams;
  const folderId = params.get('folder') ? uuid.parse(params.get('folder')) : null;
  const term = (params.get('q') || '').slice(0, 100).replace(/[%_\\,()]/g, ' ').trim();
  let files = db.from('drive_files').select(FILE_FIELDS).is('upload_id', null).order('created_at', { ascending: false }).limit(200);
  if (term) files = files.ilike('name', `%${term}%`);
  else files = folderId ? files.eq('folder_id', folderId) : files.is('folder_id', null);
  const folders = db.from('drive_folders').select('id,name,parent_id').order('name');
  const [fileRows, folderRows, usage, folder] = await Promise.all([
    files,
    folderId ? folders.eq('parent_id', folderId) : folders.is('parent_id', null),
    db.rpc('drive_usage'),
    folderId ? db.from('drive_folders').select('id,name,parent_id').eq('id', folderId).maybeSingle() : { data: null, error: null },
  ]);
  return { folder: check(folder), folders: term ? [] : check(folderRows), files: check(fileRows), usage: Number(check(usage)), limit: limit(), can_write: admin };
}
export async function createFolder(request: Request) {
  const { db } = await driveContext(request, true);
  const input = folderSchema.parse(await readJson(request));
  return check(await db.from('drive_folders').insert(input).select('id,name,parent_id').single());
}
export async function deleteFolder(request: Request, id: string) {
  const { db } = await driveContext(request, true);
  check(await db.from('drive_folders').delete().eq('id', uuid.parse(id)));
  return { id };
}
export async function startUpload(request: Request) {
  const { db, user } = await driveContext(request, true);
  const input = startSchema.parse(await readJson(request));
  const usage = Number(check(await db.rpc('drive_usage')));
  if (usage + input.size > limit()) throw new CmsError(413, 'The drive is full. Remove files or raise the storage limit.');
  const id = crypto.randomUUID();
  const key = `drive/${id}`;
  const contentType = input.content_type || 'application/octet-stream';
  const upload = await bucket().createMultipartUpload(key, { httpMetadata: { contentType } });
  const saved = await db.from('drive_files').insert({ id, folder_id: input.folder_id, name: input.name, object_key: key, content_type: contentType, size: input.size, upload_id: upload.uploadId, created_by: user.id });
  if (saved.error) { await upload.abort().catch(() => {}); check(saved); }
  return { id, part_size: DRIVE_PART_SIZE };
}
async function openUpload(request: Request, id: string) {
  const { db } = await driveContext(request, true);
  const file = await findFile(db, 'id', uuid.parse(id));
  if (!file.upload_id) throw new CmsError(409, 'This upload is already complete.');
  return { db, file, upload: bucket().resumeMultipartUpload(file.object_key, file.upload_id) };
}
export async function uploadPart(request: Request, id: string) {
  const partNumber = z.coerce.number().int().min(1).max(10000).parse(new URL(request.url).searchParams.get('part'));
  const { upload } = await openUpload(request, id);
  const bytes = await readBytes(request, DRIVE_PART_SIZE);
  const part = await upload.uploadPart(partNumber, bytes);
  return { partNumber: part.partNumber, etag: part.etag };
}
export async function completeUpload(request: Request, id: string) {
  const { db, file, upload } = await openUpload(request, id);
  const { parts } = partsSchema.parse(await readJson(request));
  const stored = await upload.complete(parts).catch(() => { throw new CmsError(400, 'The upload is incomplete. Upload the file again.'); });
  if (stored.size !== Number(file.size)) {
    await bucket().delete(file.object_key).catch(() => {});
    check(await db.from('drive_files').delete().eq('id', file.id));
    throw new CmsError(400, 'The upload is incomplete. Upload the file again.');
  }
  return check(await db.from('drive_files').update({ upload_id: null }).eq('id', file.id).select(FILE_FIELDS).single());
}
function shareToken(shared: boolean | undefined, current: string | null) {
  if (shared === undefined) return {};
  if (!shared) return { share_token: null };
  return { share_token: current || Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url') };
}
export async function updateFile(request: Request, id: string) {
  const { db } = await driveContext(request, true);
  const { shared, ...fields } = updateSchema.parse(await readJson(request));
  const file = await findFile(db, 'id', uuid.parse(id));
  return check(await db.from('drive_files').update({ ...fields, ...shareToken(shared, file.share_token) }).eq('id', file.id).select(FILE_FIELDS).single());
}
export async function deleteFile(request: Request, id: string) {
  const { db } = await driveContext(request, true);
  const file = await findFile(db, 'id', uuid.parse(id));
  if (file.upload_id) await bucket().resumeMultipartUpload(file.object_key, file.upload_id).abort().catch(() => {});
  else await bucket().delete(file.object_key);
  check(await db.from('drive_files').delete().eq('id', file.id));
  return { id: file.id };
}

function fileHeaders(file: DriveFile, object: StoredObject, isPublic: boolean) {
  const inline = INLINE_TYPES.test(file.content_type);
  const headers = new Headers({
    'Content-Type': inline ? file.content_type : 'application/octet-stream',
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    'Accept-Ranges': 'bytes', ETag: object.httpEtag, 'X-Content-Type-Options': 'nosniff',
    'Cache-Control': isPublic ? 'public, max-age=3600' : 'private, no-store',
  });
  if (file.content_type !== 'application/pdf') headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
  return headers;
}
export async function serveFile(request: Request, by: { id: string } | { token: string }) {
  const db = cmsClient(true);
  const file = 'id' in by ? await findFile(db, 'id', uuid.parse(by.id)) : await findFile(db, 'share_token', z.string().regex(/^[A-Za-z0-9_-]{43}$/).parse(by.token));
  if (file.upload_id) throw new CmsError(404, 'File not found.');
  const isPublic = file.visibility === 'public';
  if ('id' in by && !isPublic) await requireEditor(request);
  const ranged = request.headers.has('range');
  const object = await bucket().get(file.object_key, ranged ? { range: request.headers } : undefined);
  if (!object) throw new CmsError(404, 'File not found.');
  const headers = fileHeaders(file, object, isPublic);
  const offset = object.range?.offset ?? 0;
  const length = object.range?.length ?? object.size - offset;
  headers.set('Content-Length', String(length));
  if (ranged) headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
  return new Response(object.body, { status: ranged ? 206 : 200, headers });
}
