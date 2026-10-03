import { handle, json } from '@/lib/cms/http';
import { listDrive } from '@/lib/cms/drive';
export function GET(request: Request) { return handle(async () => json(await listDrive(request))); }
