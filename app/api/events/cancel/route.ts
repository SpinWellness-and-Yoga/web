import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../../../lib/logger';
import { cacheDel } from '../../../../lib/cache';

function getSupabaseClient(request?: Request) {
  const req = request as any;
  const env = req?.env || req?.ctx?.env || process.env;

  const supabaseUrl = env?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('supabase credentials not found');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: Request) {
  const startTime = Date.now();
  
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 2000) {
    logger.warn('request body too large for cancel');
    return NextResponse.json(
      { error: 'request too large' },
      { status: 413 }
    );
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.warn('invalid json in cancel request');
      return NextResponse.json(
        { error: 'invalid request format' },
        { status: 400 }
      );
    }

    const { ticket_number, email } = body;


    if ((!ticket_number || typeof ticket_number !== 'string' || ticket_number.length > 50) && 
        (!email || typeof email !== 'string' || email.length > 255)) {
      logger.warn('cancel ticket: invalid parameters');
      return NextResponse.json(
        { error: 'invalid request parameters' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(request);
    let registration = null;

    if (ticket_number) {
      const normalizedTicket = ticket_number.trim().toUpperCase();

      const { data, error: fetchError } = await supabase
      .from('event_registrations')
        .select('id, event_id, name, email, status, ticket_number')
      .eq('ticket_number', normalizedTicket)
      .single();

      if (fetchError || !data) {
        logger.warn('ticket not found');
        return NextResponse.json(
          { error: 'ticket not found' },
          { status: 404 }
        );
      }

      registration = data;
    } else if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      
      const { data, error: fetchError } = await supabase
        .from('event_registrations')
        .select('id, event_id, name, email, status, ticket_number')
        .eq('email', normalizedEmail)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError || !data) {
        logger.warn('registration not found');
        return NextResponse.json(
          { error: 'registration not found' },
          { status: 404 }
        );
      }

      registration = data;
    }

    if (!registration) {
      return NextResponse.json(
        { error: 'registration not found' },
        { status: 404 }
      );
    }

    if (registration.status === 'cancelled') {
      return NextResponse.json(
        { error: 'ticket already cancelled' },
        { status: 400 }
      );
    }

    const { data: deleteData, error: deleteError } = await supabase
      .from('event_registrations')
      .delete()
      .eq('id', registration.id)
      .select();

    if (deleteError) {
      logger.error('delete operation failed');
      return NextResponse.json(
        { error: 'failed to cancel ticket' },
        { status: 500 }
      );
    }

    const deletedRows = deleteData?.length || 0;
    if (deletedRows === 0) {
      logger.error('delete operation returned no deleted rows');
      return NextResponse.json(
        { error: 'failed to cancel ticket' },
        { status: 500 }
      );
    }

    const { data: verifyData } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('id', registration.id)
      .maybeSingle();

    if (verifyData) {
      logger.error('verification failed: registration still exists after delete');
      return NextResponse.json(
        { error: 'failed to cancel ticket' },
        { status: 500 }
      );
    }

    await cacheDel([
      `event:${registration.event_id}:with-count`,
      'events:all:with-counts',
    ]);

    revalidatePath('/events');
    revalidatePath(`/events/${registration.event_id}`);

    const duration = Date.now() - startTime;
    logger.info('ticket cancelled successfully', { 
      deleted_rows: deletedRows,
      duration_ms: duration,
    });

    return NextResponse.json({
      success: true,
      message: 'ticket cancelled successfully. your spot has been released.',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('exception cancelling ticket', {
      duration_ms: duration,
    });
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    );
  }
}

