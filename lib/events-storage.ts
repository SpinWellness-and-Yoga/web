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

// hardcoded events fallback for vercel deployment (no D1)
const hardcodedEvents: Event[] = [
  {
    id: 'lagos-2026-01-03',
    name: 'recommit to your wellbeing - lagos edition',
    description: 'join us for an intimate and exclusive wellness event in lagos. this 2-hour session is designed for young professionals looking to recommit to their wellbeing through a blend of physical practice, mindful engagement, and community building. event flow: 4:15-5:00pm - 45-minute group yoga session focused on mindful movement and breath. 5:00-5:15pm - 15-minute sound therapy session using sound bowls for deep relaxation. 5:15-5:45pm - open conversation on recommitting to your wellbeing, followed by refreshments and socializing. 5:45-6:00pm - clean-up and exit. limited to 20 attendees for an intimate and personalized experience. perfect for those looking to start their wellness journey or deepen an existing practice. this event provides practical tools and knowledge to manage stress and improve mental well-being in a safe, supportive, and welcoming environment.',
    start_date: '2026-01-03T16:00:00+01:00',
    end_date: '2026-01-03T18:00:00+01:00',
    location: 'lagos',
    venue: 'studio venue',
    capacity: 20,
    price: 0,
    is_active: 1,
    locations: '["Lagos"]',
  },
  {
    id: 'ibadan-2026-01-10',
    name: 'recommit to your wellbeing - ibadan edition',
    description: 'join us for an intimate and exclusive wellness event in ibadan. this 2-hour session is designed for young professionals looking to recommit to their wellbeing through a blend of physical practice, mindful engagement, and community building. event flow: 4:15-5:00pm - 45-minute group yoga session focused on mindful movement and breath. 5:00-5:15pm - 15-minute sound therapy session using sound bowls for deep relaxation. 5:15-5:45pm - open conversation on recommitting to your wellbeing, followed by refreshments and socializing. 5:45-6:00pm - clean-up and exit. limited to 20 attendees for an intimate and personalized experience. perfect for those looking to start their wellness journey or deepen an existing practice. this event provides practical tools and knowledge to manage stress and improve mental well-being in a safe, supportive, and welcoming environment.',
    start_date: '2026-01-10T16:00:00+01:00',
    end_date: '2026-01-10T18:00:00+01:00',
    location: 'ibadan',
    venue: 'studio venue',
    capacity: 20,
    price: 0,
    is_active: 1,
    locations: '["Ibadan"]',
  },
];

export async function getAllEvents(request?: Request): Promise<Event[]> {
  const db = getD1Database(request);
  
  if (!db) {
    console.log('[events-storage] D1 database not available, using hardcoded events (vercel deployment)');
    return hardcodedEvents.filter(e => e.is_active === 1);
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
    console.error('[events-storage] Error fetching events from D1, falling back to hardcoded events:', error);
    if (error instanceof Error) {
      console.error('[events-storage] Error message:', error.message);
    }
    return hardcodedEvents.filter(e => e.is_active === 1);
  }
}

export async function getEventById(id: string, request?: Request): Promise<Event | null> {
  const db = getD1Database(request);
  
  if (!db) {
    console.log('[events] D1 database not available, using hardcoded events');
    const event = hardcodedEvents.find(e => e.id === id && e.is_active === 1);
    return event || null;
  }

  try {
    const result = await db
      .prepare('SELECT * FROM events WHERE id = ? AND is_active = 1')
      .bind(id)
      .first();
    
    return result as Event | null;
  } catch (error) {
    console.error('[events] Error fetching event:', error);
    const event = hardcodedEvents.find(e => e.id === id && e.is_active === 1);
    return event || null;
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

