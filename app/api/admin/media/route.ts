import { handle, json } from '@/lib/cms/http';
import { adminContext, databaseError, listRange } from '@/lib/cms/operations';
import { uploadMedia } from '@/lib/cms/media';
import { mediaCategorySchema } from '@/lib/cms/validation';
export function GET(request: Request) {
  return handle(async () => {
    const { client } = await adminContext(request);
    const range = listRange(request);
    const category = new URL(request.url).searchParams.get('category');
    let query = client.from('website_media').select('id,url,alt,name,category,created_at').order('created_at', { ascending: false }).order('id').range(range.start, range.end);
    if (category) query = query.eq('category', mediaCategorySchema.parse(category));
    const { data, error } = await query;
    databaseError(error);
    return json(data);
  });
}
export function POST(request: Request) { return handle(async () => json(await uploadMedia(request), 201)); }
