import { NextResponse } from 'next/server';
import { renderEventRegistrationConfirmationEmail } from '../../../../lib/email';

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'registration';

  if (type !== 'registration') {
    return NextResponse.json({ error: 'unsupported type' }, { status: 400 });
  }

  const rendered = renderEventRegistrationConfirmationEmail({
    event_name: 'recommit to your wellbeing - lagos edition',
    event_date: 'Saturday, January 3, 2026 at 4:30 PM WAT',
    event_location: 'lagos',
    event_venue: 'studio venue',
    event_address: 'Alpha Fitness Studios, Centro Lekki Mall, Plot 65a Admiralty Way, Lekki Phase 1 Lagos, Nigeria',
    name: 'Opeyemi',
    email: 'opeyemi@example.com',
    ticket_number: 'SWAY-MJ66V4YS-PP0O',
    location_preference: 'lagos',
  });

  return new NextResponse(rendered.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}


