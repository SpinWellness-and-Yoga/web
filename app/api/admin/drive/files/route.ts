import { handle, json } from '@/lib/cms/http';
import { startUpload } from '@/lib/cms/drive';
export function POST(request: Request) { return handle(async () => json(await startUpload(request), 201)); }
