import { handle, json } from '@/lib/cms/http';
import { adminContext, databaseError, listRange } from '@/lib/cms/operations';
import { uploadMedia } from '@/lib/cms/media';
export function GET(request: Request) {
  return handle(async () => {
    const { client } = await adminContext(request);
    const range = listRange(request);
    const { data, error } = await client.from('website_media').select('id,url,alt,name,created_at').order('created_at', { ascending: false }).order('id').range(range.start, range.end);
    databaseError(error);
    return json(data);
  });
}
export function POST(request: Request) { return handle(async () => json(await uploadMedia(request), 201)); }
