'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  description: string;
  start_date: string;
  location: string;
  capacity: number;
  registrations?: any[];
  registration_count?: number;
}

export default function EventsPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);

  const loadEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setEvents(data);
          setIsOpen(true);
        }
      }
    } catch (err) {
      console.log('failed to load events:', err);
    }
  }, []);

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem('events-popup-seen');
    if (!hasSeenPopup) {
      setTimeout(() => {
        loadEvents();
      }, 2000);
    }
  }, [loadEvents]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('events-popup-seen', 'true');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isOpen || events.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      <div style={{
        position: 'relative',
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        animation: 'slideUp 0.4s ease-out',
      }}>
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.5rem',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.5rem',
            color: '#151B47',
            zIndex: 10,
          }}
        >
          ×
        </button>

        <div style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ 
              fontSize: '1.8rem', 
              color: '#151B47', 
              marginBottom: '0.5rem',
              fontFamily: 'Quando, serif',
            }}>
              upcoming wellness events
            </h2>
            <p style={{ color: '#322216' }}>
              join us for transformative experiences
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            {events.slice(0, 2).map((event) => (
              <div
                key={event.id}
                style={{
                  background: '#DFD9D4',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  marginBottom: '1rem',
                  border: '1px solid rgba(241, 111, 100, 0.2)',
                }}
              >
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  color: '#151B47', 
                  marginBottom: '0.5rem',
                  fontFamily: 'Quando, serif',
                }}>
                  {event.name}
                </h3>
                <div style={{ fontSize: '0.875rem', color: '#322216', marginBottom: '0.75rem' }}>
                  <p>📅 {formatDate(event.start_date)}</p>
                  <p>📍 {event.location}</p>
                  {event.capacity > 0 && (() => {
                    const registeredCount = event.registration_count ?? event.registrations?.length ?? 0;
                    const spotsRemaining = event.capacity - registeredCount;
                    return (
                      <p>🎫 {spotsRemaining} of {event.capacity} spots remaining</p>
                    );
                  })()}
                </div>
                <Link
                  href={`/events/${event.id}`}
                  onClick={handleClose}
                  style={{
                    display: 'inline-block',
                    padding: '0.5rem 1.5rem',
                    background: '#F16F64',
                    color: 'white',
                    borderRadius: '25px',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                  }}
                >
                  register now
                </Link>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link
              href="/events"
              onClick={handleClose}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '0.75rem',
                background: '#151B47',
                color: 'white',
                borderRadius: '25px',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              view all events
            </Link>
            <button
              onClick={handleClose}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'transparent',
                color: '#151B47',
                border: '2px solid #151B47',
                borderRadius: '25px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              maybe later
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

