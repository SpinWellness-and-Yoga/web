import { getD1Database, D1Database } from './d1';
import { getSupabaseClient } from './supabase';

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
  const supabase = getSupabaseClient();
  
  if (supabase) {
    try {
      console.log('[events-storage] Querying events from supabase...');
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: true });
      
      if (error) {
        console.error('[events-storage] Supabase error:', error);
        return hardcodedEvents.filter(e => e.is_active === 1);
      }
      
      if (data && data.length > 0) {
        console.log('[events-storage] Found', data.length, 'events from supabase');
        return data.map(event => ({
          ...event,
          is_active: event.is_active ? 1 : 0,
        })) as Event[];
      }
      
      console.log('[events-storage] No events found in supabase, using hardcoded events');
      return hardcodedEvents.filter(e => e.is_active === 1);
    } catch (error) {
      console.error('[events-storage] Error fetching from supabase:', error);
      return hardcodedEvents.filter(e => e.is_active === 1);
    }
  }
  
  console.log('[events-storage] Supabase not available, using hardcoded events');
  return hardcodedEvents.filter(e => e.is_active === 1);
}

export async function getEventById(id: string, request?: Request): Promise<Event | null> {
  const supabase = getSupabaseClient();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();
      
      if (error) {
        console.error('[events] Supabase error:', error);
        const event = hardcodedEvents.find(e => e.id === id && e.is_active === 1);
        return event || null;
      }
      
      if (data) {
        return {
          ...data,
          is_active: data.is_active ? 1 : 0,
        } as Event;
      }
    } catch (error) {
      console.error('[events] Error fetching event from supabase:', error);
    }
  }
  
  const event = hardcodedEvents.find(e => e.id === id && e.is_active === 1);
  return event || null;
}

export async function getEventRegistrations(eventId: string, request?: Request): Promise<EventRegistration[]> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    console.log('[events] Supabase not available');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[events] Error fetching registrations:', error);
      return [];
    }
    
    return (data || []).map(reg => ({
      ...reg,
      needs_directions: reg.needs_directions ? 1 : 0,
    })) as EventRegistration[];
  } catch (error) {
    console.error('[events] Error fetching registrations:', error);
    return [];
  }
}

export async function createEventRegistration(
  registration: Omit<EventRegistration, 'id' | 'created_at'>,
  request?: Request
): Promise<EventRegistration> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    throw new Error('Supabase not available');
  }

  const ticketNumber = `SWAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .insert({
        event_id: registration.event_id,
        name: registration.name,
        gender: registration.gender,
        profession: registration.profession,
        phone_number: registration.phone_number,
        email: registration.email,
        location_preference: registration.location_preference,
        needs_directions: registration.needs_directions === 1,
        notes: registration.notes || null,
        ticket_number: ticketNumber,
        status: registration.status || 'confirmed',
      })
      .select()
      .single();

    if (error) {
      console.error('[events] Error creating registration:', error);
      throw error;
    }

    return {
      ...data,
      needs_directions: data.needs_directions ? 1 : 0,
    } as EventRegistration;
  } catch (error) {
    console.error('[events] Error creating registration:', error);
    throw error;
  }
}

