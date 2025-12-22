import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { getSupabaseClient } from '../lib/supabase';

type EventRegistration = {
  id: string;
  event_id: string;
  name: string;
  gender: string;
  profession: string;
  phone_number: string;
  email: string;
  location_preference: string;
  needs_directions: boolean;
  notes?: string | null;
  ticket_number: string;
  status: string;
  created_at: string;
};

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

function escapeCsvField(field: string | null | undefined): string {
  if (field === null || field === undefined) {
    return '';
  }

  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function convertToCsv(registrations: EventRegistration[]): string {
  const headers = [
    'ticket_number',
    'event_id',
    'name',
    'email',
    'phone_number',
    'gender',
    'profession',
    'location_preference',
    'needs_directions',
    'notes',
    'status',
    'created_at',
  ];

  const rows = registrations.map((reg) => {
    return [
      escapeCsvField(reg.ticket_number),
      escapeCsvField(reg.event_id),
      escapeCsvField(reg.name),
      escapeCsvField(reg.email),
      escapeCsvField(reg.phone_number),
      escapeCsvField(reg.gender),
      escapeCsvField(reg.profession),
      escapeCsvField(reg.location_preference),
      escapeCsvField(reg.needs_directions ? 'yes' : 'no'),
      escapeCsvField(reg.notes || ''),
      escapeCsvField(reg.status),
      escapeCsvField(reg.created_at),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

async function fetchAllRegistrations() {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    throw new Error('supabase client unavailable');
  }

  const { data, error } = await supabase
    .from('event_registrations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`failed to fetch registrations: ${error.message}`);
  }

  return (data || []) as EventRegistration[];
}

function normalizeLocation(location: string): string {
  return location.toLowerCase().trim();
}

function isLagos(location: string): boolean {
  const normalized = normalizeLocation(location);
  return normalized === 'lagos' || normalized.includes('lagos');
}

function isIbadan(location: string): boolean {
  const normalized = normalizeLocation(location);
  return normalized === 'ibadan' || normalized.includes('ibadan');
}

async function main() {
  try {
    loadEnvFiles();

    console.log('fetching all registrations...');
    const allRegistrations = await fetchAllRegistrations();
    console.log(`found ${allRegistrations.length} total registrations`);

    const lagosRegistrations = allRegistrations.filter((reg) => isLagos(reg.location_preference));
    const ibadanRegistrations = allRegistrations.filter((reg) => isIbadan(reg.location_preference));

    console.log(`lagos registrations: ${lagosRegistrations.length}`);
    console.log(`ibadan registrations: ${ibadanRegistrations.length}`);

    const outputDir = join(process.cwd(), 'exports');
    await fs.mkdir(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    if (lagosRegistrations.length > 0) {
      const lagosCsv = convertToCsv(lagosRegistrations);
      const lagosPath = join(outputDir, `lagos-registrations-${timestamp}.csv`);
      await fs.writeFile(lagosPath, lagosCsv, 'utf-8');
      console.log(`exported lagos registrations to: ${lagosPath}`);
    }

    if (ibadanRegistrations.length > 0) {
      const ibadanCsv = convertToCsv(ibadanRegistrations);
      const ibadanPath = join(outputDir, `ibadan-registrations-${timestamp}.csv`);
      await fs.writeFile(ibadanPath, ibadanCsv, 'utf-8');
      console.log(`exported ibadan registrations to: ${ibadanPath}`);
    }

    console.log('export completed successfully');
  } catch (error) {
    console.error('export failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

