import { NextResponse } from 'next/server';
import { getAllEvents, getEventRegistrations } from '../../../../lib/events-storage';
import { sendEventReminder } from '../../../../lib/email';
import { getEventAddress, getEventLocationLabel } from '../../../../lib/utils';

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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  try {
    const env = getEnvFromRequest(request) || process.env;
    const events = await getAllEvents(request);
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(0, 0, 0, 0);
    
    const threeDaysFromNowEnd = new Date(threeDaysFromNow);
    threeDaysFromNowEnd.setHours(23, 59, 59, 999);

    const eventsInThreeDays = events.filter(event => {
      const eventDate = new Date(event.start_date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= threeDaysFromNow && eventDate <= threeDaysFromNowEnd;
    });

    let totalRemindersSent = 0;
    const results = [];

    for (const event of eventsInThreeDays) {
      const registrations = await getEventRegistrations(event.id, request);
      const confirmedRegistrations = registrations.filter(r => r.status === 'confirmed');

      for (const registration of confirmedRegistrations) {
        try {
          await sendEventReminder({
            event_name: event.name,
            event_date: `${new Date(event.start_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })} at 4:30 PM WAT`,
            event_location: getEventLocationLabel(event.location),
            event_address: getEventAddress(event.location),
            name: registration.name,
            email: registration.email,
            ticket_number: registration.ticket_number,
            location_preference: registration.location_preference,
          }, env);

          totalRemindersSent++;
          results.push({
            event_id: event.id,
            event_name: event.name,
            email: registration.email,
            status: 'sent',
          });
        } catch (error) {
          results.push({
            event_id: event.id,
            event_name: event.name,
            email: registration.email,
            status: 'failed',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      events_processed: eventsInThreeDays.length,
      reminders_sent: totalRemindersSent,
      results,
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'failed to send reminders' },
      { status: 500 }
    );
  }
}

