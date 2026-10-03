import { NextResponse } from 'next/server';
import { renderEventRegistrationConfirmationEmail, renderEventReminderEmail } from '../../../../lib/email';

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'registration';

  let rendered;

  if (type === 'registration') {
    rendered = renderEventRegistrationConfirmationEmail({
      event_name: 'recommit to your wellbeing - lagos edition',
      event_date: 'Saturday, January 3, 2026',
      event_time: '4:30 PM WAT',
      event_location: 'Alpha Fitness Studios, Lagos',
      event_address: 'Centro Lekki Mall, 15 Admiralty Wy, Lekki Phase 1, Lagos, Nigeria',
      event_start_iso: '2026-01-03T15:30:00.000Z',
      event_end_iso: '2026-01-03T17:30:00.000Z',
      name: 'Opeyemi',
      email: 'opeyemi@example.com',
      ticket_number: 'SWAY-MJ66V4YS-PP0O',
      location_preference: 'lagos',
    });
  } else if (type === 'reminder') {
    rendered = renderEventReminderEmail({
      event_name: 'recommit to your wellbeing - lagos edition',
      event_date: 'Saturday, January 3, 2026',
      event_time: '4:30 PM WAT',
      event_location: 'Alpha Fitness Studio, Lagos',
      event_address: 'Alpha Fitness Studios, Centro Lekki Mall, Plot 65a Admiralty Way, Lekki Phase 1 Lagos, Nigeria',
      event_id: 'lagos-2026-01-03',
      name: 'Babalola Opeyemi',
      email: 'opeyemi@example.com',
      ticket_number: 'SWAY-MJ66V4YS-PP0O',
      location_preference: 'lagos',
    });
  } else {
    return NextResponse.json({ error: 'unsupported type. use ?type=registration or ?type=reminder' }, { status: 400 });
  }

  return new NextResponse(rendered.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}


