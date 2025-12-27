'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../_components/Navbar';
import styles from '../page.module.css';
import { capitalizeWords } from '@/lib/utils';

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
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch {
      setEvents([]);
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
      <Navbar />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>{capitalizeWords('upcoming events')}</span>
              <h1 className={styles.heroTitle}>{capitalizeWords('join our wellness events')}</h1>
              <p className={styles.heroBody}>
                {capitalizeWords('experience transformative yoga, meditation, and wellness workshops designed to nourish your mind, body, and spirit.')}
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
            <div style={{ 
              maxWidth: '1200px', 
              margin: '0 auto',
            }} className={styles.eventsGrid}>
              {events.map((event) => (
                <div key={event.id} style={{ 
                  background: 'white', 
                  borderRadius: '20px', 
                  padding: '2rem', 
                  boxShadow: '0 4px 20px rgba(21, 27, 71, 0.05)',
                  transition: 'transform 0.3s',
                }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#151B47' }}>{capitalizeWords(event.name)}</h3>
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
