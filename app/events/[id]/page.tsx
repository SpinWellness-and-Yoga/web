import { notFound } from 'next/navigation';
import Link from 'next/link';
import styles from '../../page.module.css';
import { capitalizeWords, getEventVenue, getEventAddress, getMapsUrl, formatEventDescription } from '@/lib/utils';
import Navbar from '@/app/_components/Navbar';
import EventRegistrationClient from './_components/EventRegistrationClient';
import { getEventByIdWithCount } from '@/lib/events-storage';

export const revalidate = 60;

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventByIdWithCount(id);

  if (!event) {
    notFound();
  }

  const registeredCount = event.registration_count || 0;
  const spotsRemaining = event.capacity > 0 ? event.capacity - registeredCount : null;
  const soldOut = spotsRemaining !== null && spotsRemaining <= 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  return (
    <div className={styles.shell}>
      <Navbar />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <Link href="/events" style={{ color: '#F16F64', textDecoration: 'underline', marginBottom: '1rem', display: 'inline-block' }}>
                ← back to events
              </Link>
              <h1 className={styles.heroTitle}>{capitalizeWords(event.name)}</h1>
              <div style={{ fontSize: '1.1rem', color: '#322216', marginTop: '1rem' }}>
                <p><strong>{capitalizeWords('date')}:</strong> {formatDate(event.start_date)}</p>
                <p><strong>{capitalizeWords('time')}:</strong> {formatTime(event.start_date)}</p>
                {(() => {
                  const venue = getEventVenue(event.location);
                  if (venue) {
                    return (
                      <p><strong>{capitalizeWords('location')}:</strong> {venue}</p>
                    );
                  }
                  return <p><strong>{capitalizeWords('location')}:</strong> {capitalizeWords(event.location)}</p>;
                })()}
                {(() => {
                  const address = getEventAddress(event.location);
                  if (address) {
                    const mapsUrl = getMapsUrl(address);
                    return (
                      <p>
                        <strong>{capitalizeWords('address')}:</strong>{' '}
                        <a 
                          href={mapsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#F16F64', textDecoration: 'underline' }}
                        >
                          {address}
                        </a>
                      </p>
                    );
                  }
                  return null;
                })()}
                {spotsRemaining !== null && (
                  <p style={{ 
                    color: soldOut ? '#f16f64' : '#322216',
                    fontWeight: soldOut ? '600' : 'normal'
                  }}>
                    <strong>{capitalizeWords('spots available')}:</strong> {soldOut ? 'Sold Out' : `${spotsRemaining} of ${event.capacity}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '3rem', 
            alignItems: 'start' 
          }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: '#151B47' }}>{capitalizeWords('event details')}</h2>
              <div style={{ lineHeight: '1.8', color: '#322216' }}>
                {formatEventDescription(event.description).map((paragraph, index) => (
                  <p key={index} style={{ marginBottom: '1.5rem' }}>
                    {capitalizeWords(paragraph)}
                  </p>
                ))}
              </div>
              <div style={{ marginTop: '2rem' }}>
                <Link 
                  href={`/faqs/events/${event.id}`}
                    style={{
                    color: '#F16F64', 
                    textDecoration: 'underline',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  {capitalizeWords('view frequently asked questions')} →
                </Link>
              </div>
              </div>

            <EventRegistrationClient 
              eventId={event.id} 
              capacity={event.capacity}
              initialRegistrationCount={registeredCount}
                />
              </div>
        </section>

      </main>
    </div>
  );
}
