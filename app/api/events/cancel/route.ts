import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../../../lib/logger';

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
  try {
    const body = await request.json();
    const { ticket_number } = body;

    if (!ticket_number || typeof ticket_number !== 'string') {
      return NextResponse.json(
        { error: 'ticket number is required' },
        { status: 400 }
      );
    }

    const normalizedTicket = ticket_number.trim().toUpperCase();

    const supabase = getSupabaseClient(request);

    // check if ticket exists and is active
    const { data: registration, error: fetchError } = await supabase
      .from('event_registrations')
      .select('id, event_id, name, email, status')
      .eq('ticket_number', normalizedTicket)
      .single();

    if (fetchError || !registration) {
      logger.warn('ticket not found for cancellation');
      return NextResponse.json(
        { error: 'ticket not found' },
        { status: 404 }
      );
    }

    if (registration.status === 'cancelled') {
      return NextResponse.json(
        { error: 'ticket already cancelled' },
        { status: 400 }
      );
    }

    // cancel the ticket
    const { error: updateError } = await supabase
      .from('event_registrations')
      .update({ status: 'cancelled' })
      .eq('ticket_number', normalizedTicket);

    if (updateError) {
      logger.error('failed to cancel ticket', updateError);
      return NextResponse.json(
        { error: 'failed to cancel ticket' },
        { status: 500 }
      );
    }

    logger.info('ticket cancelled successfully');

    return NextResponse.json({
      success: true,
      message: 'ticket cancelled successfully',
    });
  } catch (error) {
    logger.error('exception cancelling ticket', error);
    return NextResponse.json(
      { error: 'failed to cancel ticket' },
      { status: 500 }
    );
  }
}

