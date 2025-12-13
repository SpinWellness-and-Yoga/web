import { NextResponse } from 'next/server';
import { createEventRegistration, checkDuplicateRegistration, getEventById } from '@/lib/events-storage';
import { sendEventRegistrationNotification, sendEventRegistrationConfirmation } from '@/lib/email';

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
  try {
    const body = await request.json();
    const env = getEnvFromRequest(request);
    
    const { event_id, name, gender, profession, phone_number, email, location_preference, needs_directions, notes } = body;

    if (!event_id || !name || !gender || !profession || !phone_number || !email || !location_preference) {
      return NextResponse.json(
        { error: 'missing required fields' },
        { status: 400 }
      );
    }

    const sanitizedName = name.toString().trim().substring(0, 200);
    const sanitizedEmail = email.toString().trim().toLowerCase().substring(0, 255);
    const sanitizedPhone = phone_number.toString().replace(/\D/g, '');
    const sanitizedProfession = profession.toString().trim().substring(0, 200);
    const sanitizedNotes = notes ? notes.toString().trim().substring(0, 200) : null;

    if (sanitizedPhone.length < 10 || sanitizedPhone.length > 15) {
      return NextResponse.json(
        { error: 'phone number must be between 10 and 15 digits' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'invalid email format' },
        { status: 400 }
      );
    }

    const validGenders = ['female', 'male', 'non-binary', 'prefer-not-to-say'];
    if (!validGenders.includes(gender.toString().trim())) {
      return NextResponse.json(
        { error: 'invalid gender selection' },
        { status: 400 }
      );
    }

    const validLocations = ['lagos', 'ibadan'];
    if (!validLocations.includes(location_preference.toString().trim().toLowerCase())) {
      return NextResponse.json(
        { error: 'invalid location preference' },
        { status: 400 }
      );
    }

    // check for duplicate email registration
    const isDuplicate = await checkDuplicateRegistration(event_id, email, request);
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'this email has already been registered for this event' },
        { status: 400 }
      );
    }

    // get event details for email
    const event = await getEventById(event_id, request);
    if (!event) {
      return NextResponse.json(
        { error: 'event not found' },
        { status: 404 }
      );
    }

    const registration = await createEventRegistration({
      event_id: event_id.toString().trim(),
      name: sanitizedName,
      gender: gender.toString().trim(),
      profession: sanitizedProfession,
      phone_number: sanitizedPhone,
      email: sanitizedEmail,
      location_preference: location_preference.toString().trim().toLowerCase(),
      needs_directions: needs_directions ? 1 : 0,
      notes: sanitizedNotes,
      status: 'confirmed',
    }, request);

    Promise.all([
      sendEventRegistrationNotification({
        event_name: event.name,
        event_date: new Date(event.start_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        event_location: event.location,
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
        event_date: new Date(event.start_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        event_location: event.location,
        event_venue: event.venue,
        name: registration.name,
        email: registration.email,
        ticket_number: registration.ticket_number,
        location_preference: registration.location_preference,
      }, env),
    ]).catch(() => {
      console.log('[events register API] Email sending failed (non-blocking)');
    });

    return NextResponse.json(
      { success: true, registration },
      { status: 201 }
    );
  } catch (error) {
    console.error('[events register API] Error');
    return NextResponse.json(
      { error: 'failed to register for event' },
      { status: 500 }
    );
  }
}

