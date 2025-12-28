'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from '../../page.module.css';
import eventsStyles from './EventsList.module.css';
import { capitalizeWords } from '../../../lib/utils';
import { Event } from '../../../lib/events-storage';

function normalizeEventCopy(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/\.\s+/g, '. ')
    .trim();
}

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
      <div className={eventsStyles.emptyState}>
        <p>no events available at the moment. check back soon!</p>
      </div>
    );
  }

  return (
    <section className={eventsStyles.eventsSection}>
      <div className={eventsStyles.eventsContainer}>
        <div className={styles.eventsGrid}>
          {displayEvents.map((event) => {
            const eventId = encodeURIComponent(String(event.id).trim());
            const href = `/events/${eventId}`;

            const registeredCount = event.registration_count ?? 0;
            const rawRemaining = event.capacity > 0 ? (event.capacity - registeredCount) : null;
            const spotsRemaining = rawRemaining === null ? null : Math.max(0, rawRemaining);
            const soldOut = spotsRemaining !== null && spotsRemaining <= 0;

            return (
              <article 
                key={event.id} 
                className={eventsStyles.eventCard}
              >
                <h3 className={eventsStyles.eventTitle}>{capitalizeWords(event.name)}</h3>
                <div className={eventsStyles.eventMeta}>
                  <p><strong>Date:</strong> {formatDate(event.start_date)}</p>
                  <p><strong>Location:</strong> {capitalizeWords(event.location)}</p>
                  {spotsRemaining !== null && (
                    <p>
                      <strong>Spots Available:</strong> {soldOut ? 'Sold Out' : `${spotsRemaining} of ${event.capacity} remaining`}
                    </p>
                  )}
                </div>
                <p className={eventsStyles.eventDescription}>
                  {event.description 
                    ? normalizeEventCopy(event.description).substring(0, 150) + '...'
                    : 'no description available'}
                </p>
                <Link 
                  href={href}
                  className={eventsStyles.registerButton}
                >
                  register now
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

