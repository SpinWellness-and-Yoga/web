import { NextResponse } from 'next/server';
import { getEventByIdWithCount } from '../../../../lib/events-storage';
import { logger } from '../../../../lib/logger';

export const revalidate = 180;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let eventId = 'unknown';

  try {
    const params = await context.params;
    eventId = params.id;
    
    const event = await getEventByIdWithCount(eventId, request);
    const duration = Date.now() - startTime;
    
    if (!event) {
      logger.info('event not found', { eventId, duration: `${duration}ms` });
      return NextResponse.json(
        { error: 'event not found' },
        { status: 404 }
      );
    }
    
    logger.debug('event fetched', { eventId, duration: `${duration}ms` });
    
    return NextResponse.json(event, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=360',
        'X-Response-Time': `${duration}ms`,
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('failed to fetch event', error, { eventId, duration: `${duration}ms` });
    
    return NextResponse.json(
      { error: 'failed to fetch event' },
      { status: 500 }
    );
  }
}
