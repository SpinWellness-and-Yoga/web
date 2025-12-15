import { NextResponse } from 'next/server';
import { redisEnabled, redisPing } from '../../../../lib/redis';

export async function GET() {
  if (!redisEnabled()) {
    return NextResponse.json({ ok: true, redis: { enabled: false } }, { status: 200 });
  }

  const result = await redisPing();
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, redis: { enabled: true, ok: false } },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { ok: true, redis: { enabled: true, ok: true, latencyMs: result.latencyMs } },
    { status: 200 }
  );
}


