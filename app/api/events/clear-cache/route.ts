import { NextResponse } from 'next/server';
import { cache } from '../../../../lib/cache';

export async function POST() {
  try {
    cache.invalidatePattern('event');
    cache.invalidatePattern('events');

    return NextResponse.json({ 
      success: true, 
      message: 'cache cleared' 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'failed to clear cache' },
      { status: 500 }
    );
  }
}

