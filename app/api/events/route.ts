import { NextResponse } from 'next/server';
import { getAllEvents, getEventRegistrations } from '@/lib/events-storage';

export async function GET(request: Request) {
  try {
    const events = await getAllEvents(request);
    
    // fetch registration counts for each event
    const eventsWithRegistrations = await Promise.all(
      events.map(async (event) => {
        const registrations = await getEventRegistrations(event.id, request);
        return {
          ...event,
          registrations,
          registration_count: registrations.length,
        };
      })
    );
    
    return NextResponse.json(eventsWithRegistrations || [], { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('[events API] Error fetching events');
    return NextResponse.json([], { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

