import { handle, json } from '@/lib/cms/http';
import { deleteFolder } from '@/lib/cms/drive';
type Context = { params: Promise<{ id: string }> };
export function DELETE(request: Request, context: Context) { return handle(async () => json(await deleteFolder(request, (await context.params).id))); }
