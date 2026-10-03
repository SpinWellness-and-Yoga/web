import { handle, json } from '@/lib/cms/http';
import { createFolder } from '@/lib/cms/drive';
export function POST(request: Request) { return handle(async () => json(await createFolder(request), 201)); }
