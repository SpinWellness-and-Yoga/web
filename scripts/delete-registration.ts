import { config as loadDotenv } from 'dotenv';
import { join } from 'node:path';
import { getSupabaseClient } from '../lib/supabase';
import { cacheDel } from '../lib/cache';

function loadEnvFiles(): void {
  const envPaths = [
    join(process.cwd(), '.env.local'),
    join(process.cwd(), '.env'),
  ];

  for (const envPath of envPaths) {
    try {
      loadDotenv({ path: envPath });
    } catch {
      // ignore if file doesn't exist
    }
  }
}

async function deleteRegistrationByEmail(email: string) {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    throw new Error('supabase client unavailable');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // first, find the registration
  const { data: registration, error: fetchError } = await supabase
    .from('event_registrations')
    .select('id, event_id, name, email, ticket_number, status')
    .eq('email', normalizedEmail);

  if (fetchError) {
    throw new Error(`failed to fetch registration: ${fetchError.message}`);
  }

  if (!registration || registration.length === 0) {
    console.log(`no registration found for email: ${normalizedEmail}`);
    return;
  }

  console.log(`found ${registration.length} registration(s) for ${normalizedEmail}:`);
  registration.forEach((reg) => {
    console.log(`  - ticket: ${reg.ticket_number}, event_id: ${reg.event_id}, name: ${reg.name}, status: ${reg.status}`);
  });

  // delete all registrations for this email
  const { data: deletedData, error: deleteError } = await supabase
    .from('event_registrations')
    .delete()
    .eq('email', normalizedEmail)
    .select('id');

  if (deleteError) {
    throw new Error(`failed to delete registration: ${deleteError.message}`);
  }

  const deletedCount = deletedData?.length || 0;
  console.log(`deleted ${deletedCount} registration(s) from database`);

  // verify deletion by checking if any registrations still exist
  const { data: verifyData, error: verifyError } = await supabase
    .from('event_registrations')
    .select('id, ticket_number, event_id')
    .eq('email', normalizedEmail)
    .limit(10);

  if (verifyError) {
    console.warn('warning: could not verify deletion', verifyError.message);
  } else if (verifyData && verifyData.length > 0) {
    console.error('\nerror: registrations still exist after deletion attempt:');
    verifyData.forEach((reg) => {
      console.error(`  - ticket: ${reg.ticket_number}, event_id: ${reg.event_id}`);
    });
    throw new Error(`deletion failed - ${verifyData.length} registration(s) still found in database`);
  } else {
    console.log('verification: no registrations found for this email (deletion successful)');
  }

  // invalidate cache for affected events
  const eventIds = [...new Set(registration.map((reg) => reg.event_id))];
  const cacheKeys = [
    'events:all:with-counts',
    ...eventIds.map((eventId) => `event:${eventId}:with-count`),
  ];
  
  await cacheDel(cacheKeys);
  console.log(`cache invalidated for events: ${eventIds.join(', ')}`);

  console.log(`\nsuccessfully deleted ${registration.length} registration(s) for ${normalizedEmail}`);
  console.log('\nnote: if the web app is running, you may need to refresh the page or restart the dev server');
  console.log('      to see the updated registration counts (cache is in-memory in the server process)');
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('usage: npm run delete:registration <email>');
    console.error('example: npm run delete:registration oluwanike522@gmail.com');
    process.exit(1);
  }

  try {
    loadEnvFiles();
    await deleteRegistrationByEmail(email);
  } catch (error) {
    console.error('error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

