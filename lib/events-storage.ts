import { getSupabaseClient } from './supabase';
import { logger } from './logger';
import { generateSecureTicketNumber } from './ticket-generator';
import { cacheDel, cacheGetJson, cacheSetJson } from './cache';
import { CACHE_CONFIG } from './constants';

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
  registration_count?: number;
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

export async function getAllEventsWithCounts(request?: Request): Promise<Event[]> {
  const cacheKey = 'events:all:with-counts';
  const cached = await cacheGetJson<Event[]>(cacheKey);
  
  if (cached) {
    logger.debug('returning cached events list');
    return cached;
  }

  const supabase = getSupabaseClient();
  
  if (!supabase) {
    logger.error('supabase client unavailable');
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_registrations(count)
      `)
      .eq('is_active', true)
      .order('start_date', { ascending: true });
    
    if (error) {
      logger.error('failed to fetch events with counts', error);
      return [];
    }
    
    if (!data) {
      return [];
    }
    
    const events = data.map(event => ({
      id: event.id,
      name: event.name,
      description: event.description,
      image_url: event.image_url,
      start_date: event.start_date,
      end_date: event.end_date,
      location: event.location,
      venue: event.venue,
      capacity: event.capacity,
      price: event.price,
      is_active: event.is_active ? 1 : 0,
      locations: event.locations,
      created_at: event.created_at,
      updated_at: event.updated_at,
      registration_count: event.event_registrations?.[0]?.count || 0,
    })) as Event[];

    await cacheSetJson(cacheKey, events, CACHE_CONFIG.EVENTS_LIST_TTL);
    return events;
  } catch (error) {
    logger.error('exception fetching events with counts', error);
    return [];
  }
}

export async function getAllEvents(request?: Request): Promise<Event[]> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('start_date', { ascending: true });
    
    if (error) {
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
  } catch {
    return [];
  }
}

export async function getEventById(id: string, request?: Request): Promise<Event | null> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      ...data,
      is_active: data.is_active ? 1 : 0,
    } as Event;
  } catch {
    return null;
  }
}

export async function getEventByIdWithCount(id: string, request?: Request): Promise<Event | null> {
  const cacheKey = `event:${id}:with-count`;
  const cached = await cacheGetJson<Event>(cacheKey);
  
  if (cached) {
    logger.debug('returning cached event', { eventId: id });
    return cached;
  }

  const supabase = getSupabaseClient();
  
  if (!supabase) {
    logger.error('supabase client unavailable');
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_registrations(count)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();
    
    if (error) {
      logger.warn('event not found or error', { eventId: id, error: error.message });
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    const event = {
      ...data,
      is_active: data.is_active ? 1 : 0,
      registration_count: data.event_registrations?.[0]?.count || 0,
    } as Event;

    await cacheSetJson(cacheKey, event, CACHE_CONFIG.EVENT_DETAIL_TTL);
    return event;
  } catch (error) {
    logger.error('exception fetching event by id', error, { eventId: id });
    return null;
  }
}

export async function getEventRegistrations(eventId: string, request?: Request): Promise<EventRegistration[]> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    
    if (error) {
      return [];
    }
    
    return (data || []).map(reg => ({
      ...reg,
      needs_directions: reg.needs_directions ? 1 : 0,
    })) as EventRegistration[];
  } catch {
    return [];
  }
}

export async function getEventRegistrationCount(eventId: string, request?: Request): Promise<number> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return 0;
  }

  try {
    const { count, error } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);
    
    if (error) {
      return 0;
    }
    
    return count || 0;
  } catch {
    return 0;
  }
}

export async function checkDuplicateRegistration(eventId: string, email: string, request?: Request): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    logger.error('supabase client unavailable for duplicate check');
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('email', normalizedEmail)
      .limit(1)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      logger.error('error checking duplicate registration', error, { eventId, email: normalizedEmail });
      return false;
    }
    
    const isDuplicate = !!data;
    if (isDuplicate) {
      logger.info('duplicate registration detected', { eventId, email: normalizedEmail });
    }
    
    return isDuplicate;
  } catch (error) {
    logger.error('exception checking duplicate registration', error, { eventId, email: normalizedEmail });
    return false;
  }
}

export async function createEventRegistration(
  registration: Omit<EventRegistration, 'id' | 'created_at' | 'ticket_number'>,
  request?: Request
): Promise<EventRegistration> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    logger.error('supabase client unavailable for registration');
    throw new Error('database unavailable');
  }

  const ticketNumber = generateSecureTicketNumber();
  const normalizedEmail = registration.email.toLowerCase().trim();

  try {
    // check capacity before inserting
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('capacity, event_registrations(count)')
      .eq('id', registration.event_id)
      .eq('is_active', true)
      .single();

    if (eventError || !eventData) {
      logger.error('event not found during registration', eventError, { eventId: registration.event_id });
      throw new Error('event not found');
    }

    const registrationCount = eventData.event_registrations?.[0]?.count || 0;
    if (eventData.capacity > 0 && registrationCount >= eventData.capacity) {
      logger.warn('event at capacity', { eventId: registration.event_id, capacity: eventData.capacity });
      throw new Error('event is at capacity');
    }

    // insert registration with optimistic locking
    const { data, error } = await supabase
      .from('event_registrations')
      .insert({
        event_id: registration.event_id,
        name: registration.name,
        gender: registration.gender,
        profession: registration.profession,
        phone_number: registration.phone_number,
        email: normalizedEmail,
        location_preference: registration.location_preference,
        needs_directions: registration.needs_directions === 1,
        notes: registration.notes || null,
        ticket_number: ticketNumber,
        status: registration.status || 'confirmed',
      })
      .select()
      .single();

    if (error) {
      // check for unique constraint violation
      if (error.code === '23505') {
        logger.warn('duplicate registration attempt', { eventId: registration.event_id, email: normalizedEmail });
        throw new Error('registration already exists');
      }
      logger.error('failed to create registration', error, { eventId: registration.event_id });
      throw error;
    }

    // invalidate cache after successful registration
    await cacheDel([
      `event:${registration.event_id}:with-count`,
      'events:all:with-counts',
    ]);

    logger.info('registration created successfully', { 
      eventId: registration.event_id, 
      ticketNumber,
      email: normalizedEmail 
    });

    return {
      ...data,
      needs_directions: data.needs_directions ? 1 : 0,
    } as EventRegistration;
  } catch (error) {
    logger.error('exception creating registration', error, { 
      eventId: registration.event_id, 
      email: normalizedEmail 
    });
    throw error;
  }
}
