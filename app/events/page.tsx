'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../page.module.css';

interface Event {
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
  registrations?: any[];
  registration_count?: number;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events');
      console.log('[events page] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[events page] Events received:', data.length);
        setEvents(data);
      } else {
        const errorData = await response.json();
        console.error('[events page] API error:', errorData);
      }
    } catch (err) {
      console.error('[events page] Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.shell}>
      <header className={styles.navbar}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand}>
            <Image
              src="/logos/SWAY-Primary-logo-(iteration).png"
              alt="Spinwellness & Yoga"
              width={600}
              height={200}
              priority
            />
          </Link>
          <nav className={styles.navLinks} aria-label="Primary">
            <Link href="/#services">Services</Link>
            <Link href="/#why">Why Us</Link>
            <Link href="/events">Events</Link>
            <Link href="/#waitlist">Waitlist</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>upcoming events</span>
              <h1 className={styles.heroTitle}>join our wellness events</h1>
              <p className={styles.heroBody}>
                experience transformative yoga, meditation, and wellness workshops designed to nourish your mind, body, and spirit.
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <p>loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <p>no events available at the moment. check back soon!</p>
          </div>
        ) : (
          <section style={{ padding: '4rem 2rem' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
              {events.map((event) => (
                <div key={event.id} style={{ 
                  background: 'white', 
                  borderRadius: '20px', 
                  padding: '2rem', 
                  boxShadow: '0 4px 20px rgba(21, 27, 71, 0.05)',
                  transition: 'transform 0.3s',
                }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#151B47' }}>{event.name}</h3>
                  <div style={{ fontSize: '0.9rem', color: '#322216', marginBottom: '1rem' }}>
                    <p><strong>Date:</strong> {formatDate(event.start_date)}</p>
                    <p><strong>Location:</strong> {event.location}</p>
                    {event.capacity > 0 && (() => {
                      const registeredCount = event.registration_count ?? event.registrations?.length ?? 0;
                      const spotsRemaining = event.capacity - registeredCount;
                      return (
                        <p>
                          <strong>Spots Available:</strong> {spotsRemaining} of {event.capacity} remaining
                        </p>
                      );
                    })()}
                  </div>
                  <p style={{ color: '#322216', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    {event.description.substring(0, 150)}...
                  </p>
                  <Link 
                    href={`/events/${event.id}`}
                    style={{
                      display: 'inline-block',
                      padding: '0.75rem 1.5rem',
                      background: '#F16F64',
                      color: 'white',
                      borderRadius: '25px',
                      textDecoration: 'none',
                      fontWeight: '600',
                    }}
                  >
                    register now
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

