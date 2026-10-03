import { cache } from '@/lib/cache';
import { adminContext } from '@/lib/cms/operations';
import { handle, json } from '@/lib/cms/http';

export function POST(request: Request) {
  return handle(async () => {
    await adminContext(request);
    cache.invalidatePattern('event');
    return json({ message: 'Event cache cleared.' });
  });
}
