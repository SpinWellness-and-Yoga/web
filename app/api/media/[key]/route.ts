import { z } from 'zod';
import { cmsClient } from '@/lib/cms/client';
import { CmsError, handle } from '@/lib/cms/http';
import { mediaBucket } from '@/lib/cms/media';
export function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  return handle(async () => {
    const key = z.string().regex(/^[0-9a-f-]{36}\.(png|jpg|webp)$/).parse((await context.params).key);
    const { data, error } = await cmsClient().from('website_media').select('content_type').eq('object_key', key).eq('is_public', true).maybeSingle();
    if (error) throw new CmsError(503, 'Image is unavailable.');
    if (!data) throw new CmsError(404, 'Image not found.');
    const object = await mediaBucket().get(key);
    if (!object) throw new CmsError(404, 'Image not found.');
    return new Response(object.body, { headers: {
      'Content-Type': data.content_type, 'Content-Length': String(object.size),
      'Cache-Control': 'public, max-age=31536000, immutable', ETag: object.httpEtag,
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox",
    } });
  });
}
