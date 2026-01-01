import { getEventById } from '../lib/events-storage';
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

async function sendTestReminder() {
  loadEnvFiles();

  const eventId = process.argv[2] || 'lagos-2026-01-03';
  const testEmail = process.argv[3] || 'babaloladanielope@gmail.com';
  const testName = process.argv[4] || 'Babalola Opeyemi';

  console.log(`fetching event: ${eventId}`);
  const event = await getEventById(eventId);

  if (!event) {
    console.error(`event not found: ${eventId}`);
    process.exit(1);
  }

  console.log(`event found: ${event.name}`);
  console.log(`sending test reminder to: ${testEmail}`);

  const eventDate = new Date(event.start_date);
  const eventDateFormatted = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const eventTimeFormatted = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
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
      name: testName,
      email: testEmail,
      ticket_number: 'SWAY-TEST-XXXX-XXXX',
      location_preference: event.location,
    });

    console.log('test reminder email sent successfully');
  } catch (error) {
    console.error('failed to send test reminder:', error);
    process.exit(1);
  }
}

sendTestReminder().catch((error) => {
  console.error('error:', error);
  process.exit(1);
});

