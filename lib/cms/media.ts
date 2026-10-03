import { validateImageStructure } from './image-structure';
import { imageSize } from 'image-size';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { z } from 'zod';
import { adminContext, databaseError } from './operations';
import { CmsError, readBytes } from './http';
export interface MediaBucket {
  put(key: string, value: ArrayBuffer, options: { httpMetadata: { contentType: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; size: number; httpEtag: string } | null>;
  delete(key: string): Promise<void>;
}
export function mediaBucket(): MediaBucket {
  const env = getCloudflareContext().env as unknown as { CMS_MEDIA?: MediaBucket };
  if (!env.CMS_MEDIA) throw new CmsError(503, 'Image storage is unavailable.');
  return env.CMS_MEDIA;
}
export function inspectImage(bytes: Uint8Array, mime: string): string {
  if (bytes.length < 12 || bytes.length > 5 * 1024 * 1024) throw new CmsError(400, 'Use an image smaller than 5 MB.');
  const png = [137,80,78,71,13,10,26,10].every((byte, index) => bytes[index] === byte);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
  const webp = new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP';
  let extension: string;
  if (mime === 'image/png' && png) extension = 'png';
  else if (mime === 'image/jpeg' && jpeg) extension = 'jpg';
  else if (mime === 'image/webp' && webp) extension = 'webp';
  else throw new CmsError(400, 'Use a valid PNG, JPEG, or WebP image.');

  validateImageStructure(bytes, extension);
  let dimensions: { width?: number; height?: number };
  try {
    dimensions = imageSize(Buffer.from(bytes));
  } catch {
    throw new CmsError(400, 'Use a valid PNG, JPEG, or WebP image.');
  }
  if (!dimensions.width || !dimensions.height || dimensions.width < 1 || dimensions.height < 1 || dimensions.width > 8000 || dimensions.height > 8000 || dimensions.width * dimensions.height > 32000000) {
    throw new CmsError(400, 'Use an image up to 8000 pixels per side and 32 million pixels.');
  }
  return extension;
}
export async function uploadMedia(request: Request) {
  const { client } = await adminContext(request);
  const body = await readBytes(request, 5 * 1024 * 1024 + 10000);
  const form = await new Response(body as BodyInit, { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData();
  const file = form.get('file');
  const alt = z.string().trim().min(1).max(240).parse(form.get('alt'));
  if (!(file instanceof File)) throw new CmsError(400, 'Select an image.');
  const bytes = await file.arrayBuffer();
  const extension = inspectImage(new Uint8Array(bytes), file.type);
  const id = crypto.randomUUID();
  const key = `${id}.${extension}`;
  const bucket = mediaBucket();
  await bucket.put(key, bytes, { httpMetadata: { contentType: file.type } });
  const { data, error } = await client.rpc('cms_add_media', { media_id: id, object_key: key, media_name: file.name.slice(0,180), media_alt: alt, mime_type: file.type, byte_size: bytes.byteLength });
  if (!error && data) return data;
  // only explicit transaction rejections prove that metadata did not commit.
  if (error && ['42501', '22023', '23514', '23502'].includes(error.code)) {
    await bucket.delete(key).catch(() => {});
    databaseError(error);
  }
  // a lost response can follow a commit; keep the object when its state is unknown.
  const saved = await client.from('website_media').select('*').eq('id', id).eq('object_key', key).maybeSingle();
  if (!saved.error && saved.data) return saved.data;
  throw new CmsError(503, 'Upload could not be confirmed. Check the media library before trying again.');
}
