import { NextResponse } from 'next/server';
import { getEventById, getEventRegistrations } from '@/lib/events-storage';

function getEnvFromRequest(request: Request): any {
  const req = request as any;
  
  if (req.env) return req.env;
  if (req.ctx?.env) return req.ctx.env;
  if (req.cloudflare?.env) return req.cloudflare.env;
  if (req.runtime?.env) return req.runtime.env;
  
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;
    if (g.env) return g.env;
  }
  
  return undefined;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const event = await getEventById(params.id, request);
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const registrations = await getEventRegistrations(params.id, request);
    
    return NextResponse.json({
      ...event,
      registrations,
    }, { status: 200 });
  } catch (error) {
    console.error('[events API] Error fetching event');
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}


