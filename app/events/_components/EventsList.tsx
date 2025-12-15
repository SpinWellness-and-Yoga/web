'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from '../../page.module.css';
import { capitalizeWords, normalizeEventCopy } from '../../../lib/utils';
import { Event } from '../../../lib/events-storage';

interface EventsListProps {
  events: Event[];
}

export default function EventsList({ events }: EventsListProps) {
  const [eventsState, setEventsState] = useState<Event[]>(events);

  useEffect(() => {
    setEventsState(events);
  }, [events]);

  const applyRegistrationUpdate = useCallback((eventId: string, newCount?: number, delta?: number) => {
    const id = String(eventId).trim();
    if (!id) return;

    setEventsState((prev) =>
      prev.map((e) => {
        if (String(e.id).trim() !== id) return e;

        const current = e.registration_count ?? 0;
        const next =
          typeof newCount === 'number' ? newCount : current + (typeof delta === 'number' ? delta : 0);

        const clamped = e.capacity > 0 ? Math.min(e.capacity, Math.max(0, next)) : Math.max(0, next);
        return { ...e, registration_count: clamped };
      })
    );
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onLocalUpdate = (ev: Event) => {
      const anyEv = ev as any;
      const detail = anyEv?.detail;
      if (!detail || detail.type !== 'registration') return;
      applyRegistrationUpdate(detail.eventId, detail.registration_count, detail.delta);
    };

    window.addEventListener('sway:registration', onLocalUpdate as any);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('sway:registration');
      bc.onmessage = (message) => {
        const data = (message?.data ?? {}) as any;
        if (data?.type !== 'registration') return;
        applyRegistrationUpdate(data.eventId, data.registration_count, data.delta);
      };
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'sway:registration') return;
      if (!e.newValue) return;
      try {
        const data = JSON.parse(e.newValue) as any;
        if (data?.type !== 'registration') return;
        applyRegistrationUpdate(data.eventId, data.registration_count, data.delta);
      } catch {
        // ignore
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('sway:registration', onLocalUpdate as any);
      window.removeEventListener('storage', onStorage);
      if (bc) bc.close();
    };
  }, [applyRegistrationUpdate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const displayEvents = useMemo(() => eventsState, [eventsState]);

  if (displayEvents.length === 0) {
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
        {displayEvents.map((event) => {
          const eventId = encodeURIComponent(String(event.id).trim());
          const href = `/events/${eventId}`;

          const registeredCount = event.registration_count ?? 0;
          const rawRemaining = event.capacity > 0 ? (event.capacity - registeredCount) : null;
          const spotsRemaining = rawRemaining === null ? null : Math.max(0, rawRemaining);
          const soldOut = spotsRemaining !== null && spotsRemaining <= 0;

          return (
            <div key={event.id} style={{ 
            background: 'white', 
            borderRadius: '20px', 
            padding: '2rem', 
            boxShadow: '0 4px 20px rgba(21, 27, 71, 0.05)',
            transition: 'transform 0.3s',
            opacity: soldOut ? 0.7 : 1,
          }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#151B47' }}>{capitalizeWords(event.name)}</h3>
            <div style={{ fontSize: '0.9rem', color: '#322216', marginBottom: '1rem' }}>
              <p><strong>Date:</strong> {formatDate(event.start_date)}</p>
              <p><strong>Location:</strong> {capitalizeWords(event.location)}</p>
              {spotsRemaining !== null && (
                <p>
                  <strong>Spots Available:</strong> {spotsRemaining} of {event.capacity} remaining
                </p>
              )}
            </div>
            <p style={{ color: '#322216', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              {normalizeEventCopy(event.description).substring(0, 150)}...
            </p>
            {soldOut ? (
              <span
                aria-disabled="true"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: '#DFD9D4',
                  color: '#777',
                  borderRadius: '25px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  cursor: 'not-allowed',
                  userSelect: 'none',
                }}
              >
                sold out
              </span>
            ) : (
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
            )}
          </div>
          );
        })}
      </div>
    </section>
  );
}

