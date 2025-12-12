import { NextResponse } from 'next/server';
import { getAllEvents } from '@/lib/events-storage';

export async function GET(request: Request) {
  try {
    console.log('[events API] GET /api/events called');
    
    const events = await getAllEvents(request);
    console.log('[events API] Returning', events.length, 'events');
    
    // always return 200, even if empty array
    return NextResponse.json(events || [], { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('[events API] Error details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[events API] Error message:', errorMessage);
    console.error('[events API] Error stack:', error instanceof Error ? error.stack : 'no stack');
    
    // return empty array instead of error to prevent 500
    // this allows the page to load even if database is unavailable
    return NextResponse.json([], { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

