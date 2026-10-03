import { handle } from '@/lib/cms/http';
import { serveFile } from '@/lib/cms/drive';
export function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => serveFile(request, { id: (await context.params).id }));
}
