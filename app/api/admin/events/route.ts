import { handle, json } from '@/lib/cms/http';
import { listRecords, saveRecord } from '@/lib/cms/operations';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return handle(async () => json(await listRecords(request, 'events'))); }
export function POST(request: Request) { return handle(async () => json(await saveRecord(request, 'events'), 201)); }
