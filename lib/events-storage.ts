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

export async function getAllEvents(request?: Request): Promise<Event[]> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    console.error('[events-storage] Supabase not configured');
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('start_date', { ascending: true });
    
    if (error) {
      console.error('[events-storage] Supabase error:', error.code);
      
      if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy')) {
        const fallbackResult = await supabase
          .from('events')
          .select('*')
          .order('start_date', { ascending: true });
        
        if (fallbackResult.data && fallbackResult.data.length > 0) {
          return fallbackResult.data
            .filter(e => e.is_active === true)
            .map(event => ({
              ...event,
              is_active: event.is_active ? 1 : 0,
            })) as Event[];
        }
      }
      
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    return data.map(event => ({
      ...event,
      is_active: event.is_active ? 1 : 0,
    })) as Event[];
  } catch (error) {
    console.error('[events-storage] Exception fetching events');
    return [];
  }
}

export async function getEventById(id: string, request?: Request): Promise<Event | null> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    console.error('[events] Supabase not configured');
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error('[events] Supabase error:', error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    return {
      ...data,
      is_active: data.is_active ? 1 : 0,
    } as Event;
  } catch (error) {
    console.error('[events] Error fetching event from supabase:', error);
    return null;
  }
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

export async function checkDuplicateRegistration(eventId: string, email: string, request?: Request): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('email', email.toLowerCase().trim())
      .limit(1);
    
    if (error) {
      console.error('[events] Error checking duplicate:', error);
      return false;
    }
    
    return (data && data.length > 0);
  } catch (error) {
    console.error('[events] Error checking duplicate:', error);
    return false;
  }
}

export async function createEventRegistration(
  registration: Omit<EventRegistration, 'id' | 'created_at' | 'ticket_number'>,
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

