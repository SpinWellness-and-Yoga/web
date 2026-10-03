import { handle, json } from '@/lib/cms/http';
import { completeUpload, deleteFile, updateFile, uploadPart } from '@/lib/cms/drive';
type Context = { params: Promise<{ id: string }> };
export function PUT(request: Request, context: Context) { return handle(async () => json(await uploadPart(request, (await context.params).id))); }
export function POST(request: Request, context: Context) { return handle(async () => json(await completeUpload(request, (await context.params).id))); }
export function PATCH(request: Request, context: Context) { return handle(async () => json(await updateFile(request, (await context.params).id))); }
export function DELETE(request: Request, context: Context) { return handle(async () => json(await deleteFile(request, (await context.params).id))); }
