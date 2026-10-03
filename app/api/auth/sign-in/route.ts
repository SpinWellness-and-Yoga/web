import { handle } from '@/lib/cms/http';
import { requestCode } from '@/lib/cms/sign-in';
export function POST(request: Request) { return handle(() => requestCode(request)); }
