import { NextResponse } from 'next/server';
import { cache, cacheDel } from '../../../../lib/cache';

export async function POST(request: Request) {
  try {
    let eventIds: string[] = [];
    
    try {
      const body = await request.json();
      eventIds = body.eventIds || [];
    } catch {
      // no body or invalid json, clear all
    }

    if (eventIds.length > 0) {
      // clear specific event caches
      const cacheKeys = [
        'events:all:with-counts',
        ...eventIds.map((id) => `event:${id}:with-count`),
      ];
      await cacheDel(cacheKeys);
      
      return NextResponse.json({ 
        success: true, 
        message: `cache cleared for events: ${eventIds.join(', ')}` 
      });
    } else {
      // clear all event-related cache
      cache.invalidatePattern('event');
      cache.invalidatePattern('events');
      
      return NextResponse.json({ 
        success: true, 
        message: 'all event cache cleared' 
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'failed to clear cache' },
      { status: 500 }
    );
  }
}

