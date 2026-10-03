import { api } from './request';
type Part = { partNumber: number; etag: string };
async function sendPart(id: string, partNumber: number, chunk: Blob): Promise<Part> {
  for (let attempt = 1; ; attempt++) {
    try { return await api<Part>(`/api/admin/drive/files/${id}?part=${partNumber}`, { method: 'PUT', body: chunk }); }
    catch (issue) { if (attempt === 3) throw issue; }
  }
}
// the server holds one part at a time, so a 10 GB file never has to fit in memory.
export async function uploadToDrive(file: File, folderId: string | null, progress: (fraction: number) => void) {
  const { id, part_size } = await api<{ id: string; part_size: number }>('/api/admin/drive/files', { method: 'POST', body: JSON.stringify({ name: file.name, size: file.size, content_type: file.type, folder_id: folderId }) });
  try {
    const parts: Part[] = [];
    for (let offset = 0; offset < file.size; offset += part_size) {
      parts.push(await sendPart(id, parts.length + 1, file.slice(offset, offset + part_size)));
      progress(Math.min(1, (offset + part_size) / file.size));
    }
    await api(`/api/admin/drive/files/${id}`, { method: 'POST', body: JSON.stringify({ parts }) });
  } catch (issue) {
    await api(`/api/admin/drive/files/${id}`, { method: 'DELETE' }).catch(() => {});
    throw issue;
  }
}
export function fileSize(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
