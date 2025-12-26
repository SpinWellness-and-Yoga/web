import { NextResponse } from 'next/server';
import { getAllEvents, getEventRegistrations } from '../../../../lib/events-storage';
import { sendEventReminder } from '../../../../lib/email';
import { getEventAddress, getEventLocationLabel } from '../../../../lib/utils';
import { redisDel } from '../../../../lib/redis';
import { capitalizeWords } from '../../../../lib/utils';
import { logger } from '../../../../lib/logger';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';

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

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const testSecret = process.env.TEST_API_SECRET || process.env.CRON_SECRET;
  
  if (testSecret && authHeader !== `Bearer ${testSecret}`) {
    logger.warn('unauthorized test endpoint access attempt');
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 5000) {
    logger.warn('request body too large', { contentLength });
    return NextResponse.json(
      { error: 'request body too large' },
      { status: 413 }
    );
  }

  const clientIp = getClientIp(request);
  if (!checkRateLimit(clientIp, 10, 60000)) {
    logger.warn('rate limit exceeded for test endpoint', { ip: clientIp });
    return NextResponse.json(
      { error: 'rate limit exceeded' },
      { status: 429 }
    );
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.error('invalid json in request body');
      return NextResponse.json(
        { error: 'invalid request format' },
        { status: 400 }
      );
    }

    const { email, event_location, force } = body;

    if (!email || typeof email !== 'string' || email.length > 255) {
      return NextResponse.json(
        { error: 'invalid email parameter' },
        { status: 400 }
      );
    }

    if (event_location && (typeof event_location !== 'string' || event_location.length > 100)) {
      return NextResponse.json(
        { error: 'invalid location parameter' },
        { status: 400 }
      );
    }

    const env = getEnvFromRequest(request) || process.env;
    
    let events;
    try {
      events = await getAllEvents(request);
    } catch (eventsError) {
      logger.error('failed to fetch events');
      return NextResponse.json(
        { error: 'internal server error' },
        { status: 500 }
      );
    }
    
    const targetLocation = (event_location || 'ibadan').toLowerCase();
    const targetEvent = events.find(event => {
      const locationLower = (event.location || '').toLowerCase();
      return locationLower.includes(targetLocation) && event.is_active === 1;
    });

    if (!targetEvent) {
      logger.warn('no active event found', { location: targetLocation });
      return NextResponse.json(
        { error: `no active event found for location: ${targetLocation}` },
        { status: 404 }
      );
    }

    let registrations;
    try {
      registrations = await getEventRegistrations(targetEvent.id, request);
    } catch (regError) {
      logger.error('failed to fetch registrations');
      return NextResponse.json(
        { error: 'internal server error' },
        { status: 500 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const registration = registrations.find(r => r.email.toLowerCase() === normalizedEmail && r.status === 'confirmed');

    if (!registration) {
      logger.warn('no confirmed registration found', { email: normalizedEmail, location: targetLocation });
      return NextResponse.json(
        { error: `no confirmed registration found for ${email} in ${targetLocation} event` },
        { status: 404 }
      );
    }

    const eventDate = `${new Date(targetEvent.start_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })} at 4:30 PM WAT`;
    const subject = `Event Reminder: ${capitalizeWords(targetEvent.name)} - ${eventDate}`.trim();

    if (force === true) {
      try {
        const dedupeKeyBase = `email:dedupe:event-reminder:${normalizedEmail}:${subject}`;
        const keysToDelete = [
          `${dedupeKeyBase}:sent`,
          `${dedupeKeyBase}:pending`,
        ];
        await redisDel(keysToDelete);
        
        const inMemoryDedupe = (globalThis as any).__swayEmailDedupe as Map<string, number> | undefined;
        if (inMemoryDedupe) {
          for (const key of keysToDelete) {
            inMemoryDedupe.delete(key);
          }
          for (const [key] of inMemoryDedupe.entries()) {
            if (key.includes(`event-reminder:${normalizedEmail}:`) || key.includes(`event-reminder:${normalizedEmail.toLowerCase()}:`)) {
              inMemoryDedupe.delete(key);
            }
          }
        }
        logger.info('deduplication keys cleared', { email: normalizedEmail });
      } catch (dedupeError) {
        logger.warn('failed to clear deduplication keys', { error: dedupeError, email: normalizedEmail });
      }
    }

    try {
      await sendEventReminder({
        event_name: targetEvent.name,
        event_date: eventDate,
        event_location: getEventLocationLabel(targetEvent.location),
        event_address: getEventAddress(targetEvent.location),
        name: registration.name,
        email: registration.email,
        ticket_number: registration.ticket_number,
        location_preference: registration.location_preference,
      }, env, force === true);

      return NextResponse.json({
        success: true,
        message: 'reminder email sent successfully',
        event_name: targetEvent.name,
        email: registration.email,
        ticket_number: registration.ticket_number,
      }, { status: 200 });
    } catch (emailError) {
      logger.error('failed to send reminder email');
      return NextResponse.json({
        success: false,
        error: 'failed to send reminder email',
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('unexpected error in send-reminder-test');
    return NextResponse.json(
      { 
        success: false,
        error: 'internal server error',
      },
      { status: 500 }
    );
  }
}

