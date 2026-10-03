import { notFound } from 'next/navigation';
import styles from '../../page.module.css';
import Navbar from '@/app/_components/Navbar';
import EventDetailClient from './_components/EventDetailClient';
import { getEventByIdWithCount } from '@/lib/events-storage';

export const revalidate = 60;

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventByIdWithCount(id);
  if (!event) notFound();

  return (
    <div className={styles.shell}>
      <Navbar />
      <EventDetailClient event={event} eventId={event.id} />
    </div>
  );
}
