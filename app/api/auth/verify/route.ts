import { handle } from '@/lib/cms/http';
import { verifyCode } from '@/lib/cms/sign-in';
export function POST(request: Request) { return handle(() => verifyCode(request)); }
