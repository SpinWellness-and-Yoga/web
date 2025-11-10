import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const WAITLIST_FILE = path.join(DATA_DIR, 'waitlist.json');

export interface WaitlistEntry {
  id: string;
  full_name: string;
  email: string;
  company: string;
  team_size?: string;
  priority?: string;
}

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // directory might already exist
  }
}

async function readWaitlist(): Promise<WaitlistEntry[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(WAITLIST_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeWaitlist(entries: WaitlistEntry[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(WAITLIST_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

export async function getAllEntries(): Promise<WaitlistEntry[]> {
  const entries = await readWaitlist();
  return entries.sort((a, b) => b.id.localeCompare(a.id));
}

export async function addEntry(entry: WaitlistEntry): Promise<void> {
  const entries = await readWaitlist();
  
  // check for duplicate email
  const existing = entries.find(
    (e) => e.email.toLowerCase() === entry.email.toLowerCase()
  );
  
  if (existing) {
    throw new Error('Email already on waitlist');
  }
  
  entries.push(entry);
  await writeWaitlist(entries);
}

