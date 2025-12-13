import { getD1Database, D1Database } from './d1';

export interface Event {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  start_date: string;
  end_date: string;
  location: string;
  venue?: string;
  capacity: number;
  price: number;
  is_active: number;
  locations?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  name: string;
  gender: string;
  profession: string;
  phone_number: string;
  email: string;
  location_preference: string;
  needs_directions: number;
  notes?: string;
  ticket_number: string;
  status: string;
  created_at?: string;
}

export async function getAllEvents(request?: Request): Promise<Event[]> {
  const db = getD1Database(request);
  
  if (!db) {
    console.log('[events-storage] D1 database not available');
    console.log('[events-storage] Request provided:', !!request);
    console.log('[events-storage] ⚠️  IMPORTANT: You must run with "npm run dev:cf" (wrangler dev) to access D1 database');
    console.log('[events-storage] Regular "npm run dev" (next dev) does not have D1 access');
    
    // try globalThis as fallback
    if (typeof globalThis !== 'undefined') {
      const g = globalThis as any;
      console.log('[events-storage] Checking globalThis.env:', !!g.env);
      console.log('[events-storage] globalThis.env keys:', g.env ? Object.keys(g.env) : 'none');
      
      if (g.env?.DATABASE) {
        console.log('[events-storage] Found DATABASE in globalThis.env');
        const fallbackDb = g.env.DATABASE;
        try {
          const result = await fallbackDb
            .prepare('SELECT * FROM events WHERE is_active = 1 ORDER BY start_date ASC')
            .all();
          console.log('[events-storage] Fallback query returned:', result.results?.length || 0, 'events');
          return (result.results || []) as Event[];
        } catch (error) {
          console.error('[events-storage] Error with fallback DB:', error);
        }
      }
    }
    
    return [];
  }

  try {
    console.log('[events-storage] Querying events from D1...');
    
    // first check if table exists
    try {
      const tableCheck = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'").first();
      console.log('[events-storage] Events table exists:', !!tableCheck);
      
      if (!tableCheck) {
        console.log('[events-storage] Events table does not exist! Run: wrangler d1 execute spinwellness_web --local --file=scripts/setup-events-d1.sql');
        return [];
      }
    } catch (checkError) {
      console.error('[events-storage] Error checking table:', checkError);
    }
    
    // try querying all events first (without is_active filter to debug)
    const allResult = await db.prepare('SELECT * FROM events').all();
    console.log('[events-storage] All events (no filter):', allResult.results?.length || 0);
    
    // now query with filter
    const result = await db
      .prepare('SELECT * FROM events WHERE is_active = 1 ORDER BY start_date ASC')
      .all();
    
    console.log('[events-storage] Query result:', result.results?.length || 0, 'events');
    console.log('[events-storage] First event sample:', result.results?.[0] || 'none');
    
    return (result.results || []) as Event[];
  } catch (error) {
    console.error('[events-storage] Error fetching events:', error);
    if (error instanceof Error) {
      console.error('[events-storage] Error message:', error.message);
      console.error('[events-storage] Error stack:', error.stack);
    }
    return [];
  }
}

export async function getEventById(id: string, request?: Request): Promise<Event | null> {
  const db = getD1Database(request);
  
  if (!db) {
    console.log('[events] D1 database not available');
    return null;
  }

  try {
    const result = await db
      .prepare('SELECT * FROM events WHERE id = ? AND is_active = 1')
      .bind(id)
      .first();
    
    return result as Event | null;
  } catch (error) {
    console.error('[events] Error fetching event:', error);
    return null;
  }
}

export async function getEventRegistrations(eventId: string, request?: Request): Promise<EventRegistration[]> {
  const db = getD1Database(request);
  
  if (!db) {
    console.log('[events] D1 database not available');
    return [];
  }

  try {
    const result = await db
      .prepare('SELECT * FROM event_registrations WHERE event_id = ? ORDER BY created_at DESC')
      .bind(eventId)
      .all();
    
    return (result.results || []) as EventRegistration[];
  } catch (error) {
    console.error('[events] Error fetching registrations:', error);
    return [];
  }
}

export async function createEventRegistration(
  registration: Omit<EventRegistration, 'id' | 'created_at'>,
  request?: Request
): Promise<EventRegistration> {
  const db = getD1Database(request);
  
  if (!db) {
    throw new Error('D1 database not available');
  }

  const id = crypto.randomUUID();
  const ticketNumber = `SWAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  try {
    await db
      .prepare(`
        INSERT INTO event_registrations (
          id, event_id, name, gender, profession, phone_number, email,
          location_preference, needs_directions, notes, ticket_number, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        registration.event_id,
        registration.name,
        registration.gender,
        registration.profession,
        registration.phone_number,
        registration.email,
        registration.location_preference,
        registration.needs_directions ? 1 : 0,
        registration.notes || null,
        ticketNumber,
        registration.status || 'confirmed'
      )
      .run();

    const result = await db
      .prepare('SELECT * FROM event_registrations WHERE id = ?')
      .bind(id)
      .first();

    return result as EventRegistration;
  } catch (error) {
    console.error('[events] Error creating registration:', error);
    throw error;
  }
}

