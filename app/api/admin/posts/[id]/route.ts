import { handle, json } from '@/lib/cms/http';
import { listRecords, saveRecord } from '@/lib/cms/operations';
type Context = { params: Promise<{ id: string }> };
export function GET(request: Request, context: Context) { return handle(async () => json(await listRecords(request, 'posts', (await context.params).id))); }
export function PATCH(request: Request, context: Context) { return handle(async () => json(await saveRecord(request, 'posts', (await context.params).id))); }
