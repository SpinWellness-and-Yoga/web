import { getEventRegistrations } from '../lib/events-storage';

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

async function listRegistrations() {
  loadEnvFiles();

  const eventId = 'lagos-2026-01-03';

  console.log(`fetching registrations for event: ${eventId}`);
  const registrations = await getEventRegistrations(eventId);

  if (registrations.length === 0) {
    console.log('no registrations found');
    return;
  }

  console.log(`\nfound ${registrations.length} registrations:\n`);
  registrations.forEach((reg, index) => {
    console.log(`${index + 1}. ${reg.name} (${reg.email})`);
    console.log(`   ticket: ${reg.ticket_number}`);
    console.log(`   status: ${reg.status}`);
    console.log('');
  });
}

listRegistrations().catch((error) => {
  console.error('error:', error);
  process.exit(1);
});

