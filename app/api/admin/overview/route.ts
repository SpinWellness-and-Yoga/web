import { adminContext, databaseError } from '@/lib/cms/operations';
import { handle, json } from '@/lib/cms/http';
export function GET(request: Request) {
  return handle(async () => {
    const { client } = await adminContext(request);
    const { data, error } = await client.rpc('cms_overview');
    databaseError(error);
    return json(data);
  });
}
