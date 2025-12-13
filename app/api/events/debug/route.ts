import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { getAllEvents } from '@/lib/events-storage';

export async function GET(request: Request) {
  const supabase = getSupabaseClient();
  
  const debug: any = {
    supabaseConfigured: !!supabase,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing',
  };
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .limit(1);
      
      debug.supabaseQuery = {
        success: !error,
        error: error ? error.message : null,
        dataCount: data?.length || 0,
      };
    } catch (err) {
      debug.supabaseQuery = {
        success: false,
        error: err instanceof Error ? err.message : 'unknown error',
      };
    }
  }
  
  const events = await getAllEvents(request);
  debug.eventsFromStorage = {
    count: events.length,
    ids: events.map(e => e.id),
  };
  
  return NextResponse.json(debug, { status: 200 });
}

