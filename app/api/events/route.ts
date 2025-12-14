import { NextResponse } from 'next/server';
import { getAllEventsWithCounts } from '@/lib/events-storage';

export const revalidate = 60;

export async function GET(request: Request) {
  try {
    const events = await getAllEventsWithCounts(request);
    
    return NextResponse.json(events || [], { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      }
    });
  } catch {
    return NextResponse.json([], { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      }
    });
  }
}
