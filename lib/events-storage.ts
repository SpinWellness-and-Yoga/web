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
    console.error('[events-storage] Supabase not configured - check environment variables');
    console.error('[events-storage] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing');
    console.error('[events-storage] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing');
    return [];
  }
  
  try {
    console.log('[events-storage] Querying events from supabase...');
    
    // first try without is_active filter to see all events
    const allEventsResult = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: true });
    
    console.log('[events-storage] All events query result:', {
      dataCount: allEventsResult.data?.length || 0,
      error: allEventsResult.error ? {
        code: allEventsResult.error.code,
        message: allEventsResult.error.message,
        details: allEventsResult.error.details,
        hint: allEventsResult.error.hint,
      } : null,
    });
    
    // now query with is_active filter
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('start_date', { ascending: true });
    
    if (error) {
      console.error('[events-storage] Supabase error:', error);
      console.error('[events-storage] Error code:', error.code);
      console.error('[events-storage] Error message:', error.message);
      console.error('[events-storage] Error details:', error.details);
      console.error('[events-storage] Error hint:', error.hint);
      
      // if RLS error, try without filter
      if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy')) {
        console.log('[events-storage] RLS error detected, trying without is_active filter...');
        const fallbackResult = await supabase
          .from('events')
          .select('*')
          .order('start_date', { ascending: true });
        
        if (fallbackResult.data && fallbackResult.data.length > 0) {
          console.log('[events-storage] Found', fallbackResult.data.length, 'events (without filter)');
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
    
    if (!data) {
      console.log('[events-storage] No data returned from supabase');
      return [];
    }
    
    if (data.length === 0) {
      console.log('[events-storage] No active events found in database');
      console.log('[events-storage] Total events in table:', allEventsResult.data?.length || 0);
      if (allEventsResult.data && allEventsResult.data.length > 0) {
        console.log('[events-storage] Sample event is_active values:', allEventsResult.data.map(e => ({ id: e.id, is_active: e.is_active })));
      }
      return [];
    }
    
    console.log('[events-storage] Found', data.length, 'events from supabase');
    return data.map(event => ({
      ...event,
      is_active: event.is_active ? 1 : 0,
    })) as Event[];
  } catch (error) {
    console.error('[events-storage] Exception fetching from supabase:', error);
    if (error instanceof Error) {
      console.error('[events-storage] Error message:', error.message);
      console.error('[events-storage] Error stack:', error.stack);
    }
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

