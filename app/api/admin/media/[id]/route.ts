import { handle, json } from '@/lib/cms/http';
import { setMediaCategory } from '@/lib/cms/media';
export function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => json(await setMediaCategory(request, (await context.params).id)));
}
