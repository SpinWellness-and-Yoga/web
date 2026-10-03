import { handle } from '@/lib/cms/http';
import { serveFile } from '@/lib/cms/drive';
export function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  return handle(async () => serveFile(request, { token: (await context.params).token }));
}
