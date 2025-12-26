'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../page.module.css';
import Navbar from '../_components/Navbar';

function CancelTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ticketNumber, setTicketNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ticketParam = searchParams.get('ticket');
    if (ticketParam) {
      setTicketNumber(ticketParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!ticketNumber.trim()) {
        setError('ticket number is required');
        setLoading(false);
        return;
      }

      const payload = { ticket_number: ticketNumber.trim() };

      const response = await fetch('/api/events/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTicketNumber('');
      } else {
        const errorMsg = data.error || 'failed to cancel ticket';
        setError(errorMsg.charAt(0).toUpperCase() + errorMsg.slice(1));
        setShowConfirm(false);
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
        <div style={{ 
          maxWidth: '600px', 
          width: '100%', 
          padding: '3rem 2rem',
          paddingTop: isMobile ? '5rem' : '3rem',
        }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#151B47', textAlign: 'center' }}>Cancel Ticket</h1>
          <p style={{ fontSize: '1.1rem', color: '#322216', marginBottom: '2rem', textAlign: 'center', lineHeight: '1.6' }}>
            can&apos;t make it to the event? cancel your ticket so someone else can attend.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#151B47', fontWeight: '600', fontSize: '1rem' }}>
                enter your ticket number
              </label>
              <input
                type="text"
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
                padding: '1rem 1.25rem',
                background: '#fef2f2',
                color: '#991b1b',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.95rem',
                lineHeight: '1.5',
                border: '1px solid #fecaca',
              }}>
                {error}
              </div>
            )}

            {showConfirm && (
              <div style={{
                padding: '2rem',
                background: 'linear-gradient(180deg, #fdf7f1 0%, #f8f1ea 100%)',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                border: '2px solid #f16f64',
                boxShadow: '0 8px 24px rgba(21, 27, 71, 0.08)',
              }}>
                <h3 style={{ 
                  margin: '0 0 12px', 
                  fontSize: '1.3rem', 
                  color: '#151B47',
                  fontWeight: '600',
                }}>
                  are you sure you want to cancel?
                </h3>
                <p style={{ 
                  margin: '0 0 20px', 
                  fontSize: '1rem', 
                  color: '#322216',
                  lineHeight: '1.6',
                }}>
                  this action is irreversible. once you cancel, your ticket will be permanently removed and the spot will be released for someone else to register.
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirm(false);
                      setError(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '0.875rem 1.5rem',
                      background: 'white',
                      color: '#151B47',
                      border: '2px solid #DFD9D4',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    go back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '0.875rem 1.5rem',
                      background: loading ? '#DFD9D4' : '#f16f64',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'cancelling...' : 'yes, cancel my ticket'}
                  </button>
                </div>
              </div>
            )}

            {!showConfirm && (
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
            )}
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

export default function CancelTicketPage() {
  return (
    <Suspense fallback={
      <div className={styles.shell}>
        <Navbar />
        <main className={styles.main} style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: '600px', textAlign: 'center', padding: '3rem 2rem' }}>
            <p style={{ fontSize: '1.1rem', color: '#322216' }}>loading...</p>
          </div>
        </main>
      </div>
    }>
      <CancelTicketForm />
    </Suspense>
  );
}

