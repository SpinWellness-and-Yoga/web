import { NextResponse } from 'next/server';
import { getAllEventsWithCounts } from '@/lib/events-storage';
import { logger } from '@/lib/logger';

export const revalidate = 300;

export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    const events = await getAllEventsWithCounts(request);
    const duration = Date.now() - startTime;
    
    logger.debug('events list fetched', { count: events.length, duration: `${duration}ms` });
    
    return NextResponse.json(events || [], { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Response-Time': `${duration}ms`,
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('failed to fetch events', error, { duration: `${duration}ms` });
    
    return NextResponse.json([], { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }
    });
  }
}
