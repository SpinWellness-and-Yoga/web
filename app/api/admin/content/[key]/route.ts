import { z } from 'zod';
import { adminContext, databaseError } from '@/lib/cms/operations';
import { handle, json, readJson } from '@/lib/cms/http';
import { contentKeySchema, contentSchemas, versionSchema } from '@/lib/cms/validation';
type Context = { params: Promise<{ key: string }> };
export function GET(request: Request, context: Context) {
  return handle(async () => {
    const { client } = await adminContext(request);
    const key = contentKeySchema.parse((await context.params).key);
    const { data, error } = await client.from('website_content').select('*').eq('key', key).maybeSingle();
    databaseError(error);
    return json(data || { key, value: null, version: 0, updated_at: null });
  });
}
export function PUT(request: Request, context: Context) {
  return handle(async () => {
    const { client } = await adminContext(request);
    const key = contentKeySchema.parse((await context.params).key);
    const body = z.object({ value: z.unknown(), version: versionSchema }).strict().parse(await readJson(request));
    const { data, error } = await client.rpc('cms_save', { collection_name: 'content', record_id: key, expected_version: body.version, payload: { value: contentSchemas[key].parse(body.value) } });
    databaseError(error);
    return json(data);
  });
}
