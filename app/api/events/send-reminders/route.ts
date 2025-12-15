import { NextResponse } from 'next/server';
import { getAllEvents, getEventRegistrations } from '../../../../lib/events-storage';
import { sendEventReminder } from '../../../../lib/email';
import { getEventLocationLabel } from '../../../../lib/utils';

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
    
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    twoDaysFromNow.setHours(0, 0, 0, 0);
    
    const twoDaysFromNowEnd = new Date(twoDaysFromNow);
    twoDaysFromNowEnd.setHours(23, 59, 59, 999);

    const eventsInTwoDays = events.filter(event => {
      const eventDate = new Date(event.start_date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= twoDaysFromNow && eventDate <= twoDaysFromNowEnd;
    });

    console.log(`[send-reminders] Found ${eventsInTwoDays.length} events happening in 2 days`);

    let totalRemindersSent = 0;
    const results = [];

    for (const event of eventsInTwoDays) {
      const registrations = await getEventRegistrations(event.id, request);
      
      console.log(`[send-reminders] Processing event ${event.id}: ${registrations.length} registrations`);

      for (const registration of registrations) {
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
          console.error(`[send-reminders] Failed to send reminder to ${registration.email}:`, error);
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
      events_processed: eventsInTwoDays.length,
      reminders_sent: totalRemindersSent,
      results,
    }, { status: 200 });
  } catch (error) {
    console.error('[send-reminders] Error:', error);
    return NextResponse.json(
      { error: 'failed to send reminders' },
      { status: 500 }
    );
  }
}

