import { NextResponse } from 'next/server';
import { createEventRegistration, checkDuplicateRegistration, getEventById } from '../../../../lib/events-storage';
import { sendEventRegistrationNotification, sendEventRegistrationConfirmation } from '../../../../lib/email';
import { getEventAddress, getEventLocationLabel } from '../../../../lib/utils';
import { validateRegistration, sanitizeRegistrationInput } from '../../../../lib/validation';
import { checkRegistrationRateLimit, getClientIp } from '../../../../lib/rate-limit';
import { generateIdempotencyKey } from '../../../../lib/ticket-generator';
import { logger } from '../../../../lib/logger';
import { cache } from '../../../../lib/cache';

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

// idempotency store for duplicate request prevention
const idempotencyStore = new Map<string, { response: any; expiresAt: number }>();

// cleanup expired idempotency keys every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of idempotencyStore.entries()) {
    if (now > value.expiresAt) {
      idempotencyStore.delete(key);
    }
  }
}, 600000);

export async function POST(request: Request) {
  const startTime = Date.now();
  let clientIp = 'unknown';
  let sanitizedEmail = '';

  try {
    // parse request body with size limit check
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10000) {
      logger.warn('request body too large', { contentLength });
      return NextResponse.json(
        { error: 'request body too large' },
        { status: 413 }
      );
    }

    const body = await request.json();
    const env = getEnvFromRequest(request) || process.env;
    
    const { event_id, name, gender, profession, phone_number, email, location_preference, needs_directions, notes } = body;

    // basic required field check
    if (!event_id || !name || !gender || !profession || !phone_number || !email || !location_preference) {
      return NextResponse.json(
        { error: 'missing required fields' },
        { status: 400 }
      );
    }

    // sanitize and validate input
    const sanitizedInput = sanitizeRegistrationInput({
      name,
      email,
      phone_number,
      gender,
      profession,
      location_preference,
      notes,
    });

    sanitizedEmail = sanitizedInput.email;

    const validation = validateRegistration(sanitizedInput);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      logger.info('validation failed', { errors: validation.errors });
      return NextResponse.json(
        { error: firstError },
        { status: 400 }
      );
    }

    // rate limiting
    clientIp = getClientIp(request);
    const rateLimitCheck = checkRegistrationRateLimit(clientIp, sanitizedEmail);
    if (!rateLimitCheck.allowed) {
      logger.warn('rate limit exceeded', { ip: clientIp, email: sanitizedEmail });
      return NextResponse.json(
        { error: rateLimitCheck.reason },
        { status: 429 }
      );
    }

    // idempotency check
    const idempotencyKey = generateIdempotencyKey(event_id, sanitizedEmail);
    const existingResponse = idempotencyStore.get(idempotencyKey);
    if (existingResponse && Date.now() < existingResponse.expiresAt) {
      logger.info('returning idempotent response', { eventId: event_id, email: sanitizedEmail });
      return NextResponse.json(existingResponse.response, { status: 201 });
    }

    // check for duplicate registration
    const isDuplicate = await checkDuplicateRegistration(event_id, sanitizedEmail, request);
    if (isDuplicate) {
      logger.info('duplicate registration attempt', { eventId: event_id, email: sanitizedEmail });
      return NextResponse.json(
        { error: 'this email has already been registered for this event' },
        { status: 400 }
      );
    }

    // verify event exists
    const event = await getEventById(event_id, request);
    if (!event) {
      logger.warn('event not found', { eventId: event_id });
      return NextResponse.json(
        { error: 'event not found' },
        { status: 404 }
      );
    }

    // create registration (with atomic capacity check inside)
    const registration = await createEventRegistration({
      event_id: event_id.toString().trim(),
      name: sanitizedInput.name,
      gender: sanitizedInput.gender,
      profession: sanitizedInput.profession,
      phone_number: sanitizedInput.phone_number,
      email: sanitizedInput.email,
      location_preference: sanitizedInput.location_preference,
      needs_directions: needs_directions ? 1 : 0,
      notes: sanitizedInput.notes || undefined,
      status: 'confirmed',
    }, request);

    const eventDateOnly = new Date(event.start_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const eventTime = '4:30 PM WAT';
    const eventDate = `${eventDateOnly} at ${eventTime}`;

    // send emails asynchronously (non-blocking)
    Promise.all([
      sendEventRegistrationNotification({
        event_name: event.name,
        event_date: eventDate,
        event_location: getEventLocationLabel(event.location),
        name: registration.name,
        email: registration.email,
        phone_number: registration.phone_number,
        gender: registration.gender,
        profession: registration.profession,
        location_preference: registration.location_preference,
        needs_directions: registration.needs_directions === 1,
        notes: registration.notes || undefined,
        ticket_number: registration.ticket_number,
      }, env),
      sendEventRegistrationConfirmation({
        event_name: event.name,
        event_date: eventDateOnly,
        event_time: eventTime,
        event_location: getEventLocationLabel(event.location),
        event_address: getEventAddress(event.location),
        name: registration.name,
        email: registration.email,
        ticket_number: registration.ticket_number,
        location_preference: registration.location_preference,
      }, env),
    ]).catch((error) => {
      logger.error('email sending failed', error, { ticketNumber: registration.ticket_number });
    });

    const responseData = { success: true, registration };
    
    // store in idempotency cache for 5 minutes
    idempotencyStore.set(idempotencyKey, {
      response: responseData,
      expiresAt: Date.now() + 300000,
    });

    const duration = Date.now() - startTime;
    logger.info('registration successful', { 
      eventId: event_id, 
      ticketNumber: registration.ticket_number,
      duration: `${duration}ms`,
      ip: clientIp,
    });

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('registration failed', error, { 
      email: sanitizedEmail,
      ip: clientIp,
      duration: `${duration}ms`,
    });

    // check for specific error messages
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('at capacity')) {
      return NextResponse.json(
        { error: 'event is at capacity' },
        { status: 400 }
      );
    }
    if (errorMessage.includes('already exists')) {
      return NextResponse.json(
        { error: 'this email has already been registered for this event' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'failed to register for event' },
      { status: 500 }
    );
  }
}
