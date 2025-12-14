import { NextResponse } from 'next/server';
import { getEventByIdWithCount } from '@/lib/events-storage';

export const revalidate = 30;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const event = await getEventByIdWithCount(params.id, request);
    
    if (!event) {
      return NextResponse.json(
        { error: 'event not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(event, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      }
    });
  } catch {
    return NextResponse.json(
      { error: 'failed to fetch event' },
      { status: 500 }
    );
  }
}
