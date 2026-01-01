'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../page.module.css';
import Navbar from '../_components/Navbar';

export default function CancelTicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ticketNumber, setTicketNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ticketParam = searchParams.get('ticket');
    if (ticketParam) {
      setTicketNumber(ticketParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/events/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_number: ticketNumber.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTicketNumber('');
      } else {
        setError(data.error || 'failed to cancel ticket');
      }
    } catch {
      setError('failed to cancel ticket. please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.shell}>
        <Navbar />
        <main className={styles.main} style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: '600px', textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem', color: '#f16f64' }}>✓</div>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#151B47' }}>ticket cancelled</h1>
            <p style={{ fontSize: '1.1rem', color: '#322216', marginBottom: '2rem', lineHeight: '1.6' }}>
              your ticket has been successfully cancelled. the spot is now available for someone else.
            </p>
            <button
              onClick={() => router.push('/events')}
              style={{
                padding: '1rem 2rem',
                background: '#f16f64',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              back to events
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <Navbar />
      <main className={styles.main} style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '600px', width: '100%', padding: '3rem 2rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#151B47', textAlign: 'center' }}>cancel ticket</h1>
          <p style={{ fontSize: '1.1rem', color: '#322216', marginBottom: '2rem', textAlign: 'center', lineHeight: '1.6' }}>
            can&apos;t make it to the event? cancel your ticket so someone else can attend.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#151B47', fontWeight: '600', fontSize: '1rem' }}>
                ticket number
              </label>
              <input
                type="text"
                required
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                placeholder="e.g., SWAY-MJ7U0FXX-9C54-9164"
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '1px solid #DFD9D4',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '1rem',
                background: '#fef2f2',
                color: '#991b1b',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.95rem',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !ticketNumber.trim()}
              style={{
                width: '100%',
                padding: '1rem',
                background: loading || !ticketNumber.trim() ? '#DFD9D4' : '#f16f64',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading || !ticketNumber.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'cancelling...' : 'cancel ticket'}
            </button>
          </form>

          <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
            need help? contact us at{' '}
            <a href="mailto:admin@spinwellnessandyoga.com" style={{ color: '#f16f64', textDecoration: 'underline' }}>
              admin@spinwellnessandyoga.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

