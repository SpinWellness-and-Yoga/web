import React from 'react';
import Link from 'next/link';
import Navbar from '../../_components/Navbar';
import styles from '../../page.module.css';
import { getEventByIdWithCount, getAllEventsWithCounts } from '../../../lib/events-storage';
import EventDetailClient from './_components/EventDetailClient';

export const revalidate = 180;

export async function generateStaticParams() {
  try {
    const events = await getAllEventsWithCounts();
    return events.map((event) => ({ id: event.id }));
  } catch {
    return [];
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const event = await getEventByIdWithCount(eventId);

  if (!event) {
    return (
      <div className={styles.shell}>
        <Navbar />
        <main className={styles.main}>
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <h1>event not found</h1>
            <Link href="/events" style={{ color: '#F16F64', textDecoration: 'underline' }}>
              back to events
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.shell} style={{ position: 'relative' }}>
      <Navbar />
      <EventDetailClient event={event} eventId={eventId} />
    </div>
  );
}
