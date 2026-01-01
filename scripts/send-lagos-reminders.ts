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

async function sendLagosReminders() {
  loadEnvFiles();

  const eventId = 'lagos-2026-01-03';
  const testEmail = process.argv[2]; // optional test email

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

  // filter out cancelled registrations
  const activeRegistrations = registrations.filter(reg => reg.status !== 'cancelled');
  console.log(`found ${activeRegistrations.length} active registrations (${registrations.length - activeRegistrations.length} cancelled)`);

  if (testEmail) {
    // send test email to specified email
    console.log(`sending test reminder to: ${testEmail}`);
    const eventDate = new Date(event.start_date);
    const eventDateFormatted = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Africa/Lagos',
    });
    const eventTimeFormatted = eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      timeZone: 'Africa/Lagos',
    });

    const venue = getEventVenue(event.location);
    const address = getEventAddress(event.location);

    try {
      await sendEventReminder({
        event_name: event.name,
        event_date: eventDateFormatted,
        event_time: eventTimeFormatted,
        event_location: venue || event.location,
        event_address: address || event.location,
        event_id: event.id,
        name: 'Test User',
        email: testEmail,
        ticket_number: 'SWAY-TEST-XXXX-XXXX',
        location_preference: event.location,
      });

      console.log('test reminder email sent successfully');
    } catch (error) {
      console.error('failed to send test reminder:', error);
      process.exit(1);
    }
    return;
  }

  // send reminders to all active registrations
  const eventDate = new Date(event.start_date);
  const eventDateFormatted = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Africa/Lagos',
  });
  const eventTimeFormatted = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: 'Africa/Lagos',
  });

  const venue = getEventVenue(event.location);
  const address = getEventAddress(event.location);

  let successCount = 0;
  let failCount = 0;

  for (const registration of activeRegistrations) {
    try {
      console.log(`sending reminder to ${registration.email} (${registration.name})...`);
      await sendEventReminder({
        event_name: event.name,
        event_date: eventDateFormatted,
        event_time: eventTimeFormatted,
        event_location: venue || event.location,
        event_address: address || event.location,
        event_id: event.id,
        name: registration.name,
        email: registration.email,
        ticket_number: registration.ticket_number,
        location_preference: registration.location_preference,
      });

      successCount++;
      console.log(`✓ sent to ${registration.email}`);
    } catch (error) {
      failCount++;
      console.error(`✗ failed to send to ${registration.email}:`, error instanceof Error ? error.message : 'unknown error');
    }
  }

  console.log(`\nreminder emails sent:`);
  console.log(`  success: ${successCount}`);
  console.log(`  failed: ${failCount}`);
  console.log(`  total: ${activeRegistrations.length}`);
}

sendLagosReminders().catch((error) => {
  console.error('error:', error);
  process.exit(1);
});

