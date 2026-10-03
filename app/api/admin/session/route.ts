import { adminContext } from '@/lib/cms/operations';
import { handle, json } from '@/lib/cms/http';
export function GET(request: Request) {
  return handle(async () => {
    const { user } = await adminContext(request);
    return json({ email: user.email });
  });
}
