import { getEventById } from '../lib/events-storage';
import { getEventRegistrations } from '../lib/events-storage';
import { sendEventReminder } from '../lib/email';
import { getEventVenue, getEventAddress } from '../lib/utils';

function loadEnvFiles(): void {
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch {
    try {
      require('dotenv').config({ path: '.env' });
    } catch {
      // ignore if file doesn't exist
    }
  }
}

async function sendSingleReminder() {
  loadEnvFiles();

  const eventId = 'lagos-2026-01-03';
  const targetEmail = 'cspinyoga@gmail.com';

  console.log(`fetching event: ${eventId}`);
  const event = await getEventById(eventId);

  if (!event) {
    console.error(`event not found: ${eventId}`);
    process.exit(1);
  }

  console.log(`event found: ${event.name}`);

  // get all registrations for this event
  console.log('fetching registrations...');
  const registrations = await getEventRegistrations(eventId);

  if (registrations.length === 0) {
    console.log('no registrations found for this event');
    process.exit(0);
  }

  // use first active registration's details
  const activeRegistrations = registrations.filter(reg => reg.status !== 'cancelled');
  if (activeRegistrations.length === 0) {
    console.error('no active registrations found');
    process.exit(1);
  }

  const registration = activeRegistrations[0];
  console.log(`using registration details from: ${registration.name} (${registration.email})`);
  console.log(`ticket number: ${registration.ticket_number}`);

  const eventDate = new Date(event.start_date);
  const eventDateFormatted = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Africa/Lagos',
  });
  // event time is 4:30 PM WAT
  const eventTimeFormatted = '4:30 PM WAT';

  const venue = getEventVenue(event.location);
  const address = getEventAddress(event.location);

  try {
    console.log(`sending reminder to ${targetEmail} using ajoke's registration details...`);
    await sendEventReminder({
      event_name: event.name,
      event_date: eventDateFormatted,
      event_time: eventTimeFormatted,
      event_location: venue || event.location,
      event_address: address || event.location,
      event_id: event.id,
      name: 'Ajoke',
      email: targetEmail,
      ticket_number: registration.ticket_number,
      location_preference: registration.location_preference,
    });

    console.log('reminder email sent successfully');
  } catch (error) {
    console.error('failed to send reminder:', error);
    process.exit(1);
  }
}

sendSingleReminder().catch((error) => {
  console.error('error:', error);
  process.exit(1);
});

