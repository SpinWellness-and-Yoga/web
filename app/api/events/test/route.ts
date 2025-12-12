import { NextResponse } from 'next/server';
import { getD1Database } from '@/lib/d1';

export async function GET(request: Request) {
  const db = getD1Database(request);
  
  const info = {
    databaseAvailable: !!db,
    requestProvided: !!request,
    globalThisEnv: typeof globalThis !== 'undefined' ? {
      exists: !!(globalThis as any).env,
      hasDatabase: !!((globalThis as any).env?.DATABASE),
      keys: (globalThis as any).env ? Object.keys((globalThis as any).env) : []
    } : null,
    requestEnv: request ? {
      hasEnv: !!(request as any).env,
      hasCtx: !!(request as any).ctx,
      hasCloudflare: !!(request as any).cloudflare,
    } : null
  };
  
  if (db) {
    try {
      const result = await db.prepare('SELECT COUNT(*) as count FROM events').first();
      info.databaseAvailable = true;
      return NextResponse.json({
        ...info,
        eventCount: result,
        message: 'Database is accessible!'
      });
    } catch (error) {
      return NextResponse.json({
        ...info,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Database found but query failed'
      });
    }
  }
  
  return NextResponse.json({
    ...info,
    message: 'Database not available. Make sure you are running with: npm run dev:cf'
  });
}

