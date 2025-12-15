'use client';

import React from 'react';
import Link from 'next/link';
import styles from '../../page.module.css';
import { capitalizeWords, normalizeEventCopy } from '../../../lib/utils';
import { Event } from '../../../lib/events-storage';

interface EventsListProps {
  events: Event[];
}

export default function EventsList({ events }: EventsListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p>no events available at the moment. check back soon!</p>
      </div>
    );
  }

  return (
    <section style={{ padding: '4rem 2rem' }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
      }} className={styles.eventsGrid}>
        {events.map((event) => (
          (() => {
            const eventId = encodeURIComponent(String(event.id).trim());
            const href = `/events/${eventId}`;
            return (
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
              <p><strong>Location:</strong> {capitalizeWords(event.location)}</p>
              {event.capacity > 0 && (() => {
                const registeredCount = event.registration_count ?? 0;
                const spotsRemaining = event.capacity - registeredCount;
                return (
                  <p>
                    <strong>Spots Available:</strong> {spotsRemaining} of {event.capacity} remaining
                  </p>
                );
              })()}
            </div>
            <p style={{ color: '#322216', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              {normalizeEventCopy(event.description).substring(0, 150)}...
            </p>
            <Link 
              href={href}
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
            );
          })()
        ))}
      </div>
    </section>
  );
}

