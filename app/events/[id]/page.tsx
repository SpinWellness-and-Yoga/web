'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../../page.module.css';
import { capitalizeWords, getEventAddress, getMapsUrl, formatEventDescription } from '@/lib/utils';

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
}

interface RegistrationForm {
  name: string;
  gender: string;
  profession: string;
  phone_number: string;
  email: string;
  location_preference: string;
  needs_directions: boolean;
  notes: string;
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState<RegistrationForm>({
    name: '',
    gender: '',
    profession: '',
    phone_number: '',
    email: '',
    location_preference: '',
    needs_directions: false,
    notes: '',
  });

  const [validationErrors, setValidationErrors] = useState<{
    phone_number?: string;
    notes?: string;
  }>({});

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${eventId}`);
      
      if (response.ok) {
        const data = await response.json();
        setEvent(data);
        
        if (eventId.includes('lagos')) {
          setFormData(prev => ({ ...prev, location_preference: 'lagos' }));
        } else if (eventId.includes('ibadan')) {
          setFormData(prev => ({ ...prev, location_preference: 'ibadan' }));
        }
      } else if (response.status === 404) {
        setEvent(null);
      }
    } catch {
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    const numbersOnly = value.replace(/\D/g, '');
    setFormData({ ...formData, phone_number: numbersOnly });
    if (validationErrors.phone_number) {
      setValidationErrors({ ...validationErrors, phone_number: undefined });
    }
  };

  const handleNotesChange = (value: string) => {
    if (value.length <= 200) {
      setFormData({ ...formData, notes: value });
      if (validationErrors.notes) {
        setValidationErrors({ ...validationErrors, notes: undefined });
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: { phone_number?: string; notes?: string } = {};

    if (!formData.phone_number || formData.phone_number.length < 10) {
      errors.phone_number = 'phone number must be at least 10 digits';
    }

    if (formData.notes && formData.notes.length > 200) {
      errors.notes = 'notes cannot exceed 200 characters';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setValidationErrors({});

    const registeredCount = event?.registrations?.length || 0;
    const spotsRemaining = event && event.capacity > 0 ? event.capacity - registeredCount : null;
    
    if (spotsRemaining !== null && spotsRemaining <= 0) {
      setSubmitError('this event is sold out');
      setSubmitting(false);
      return;
    }

    if (!validateForm()) {
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          event_id: eventId,
          needs_directions: formData.needs_directions ? 1 : 0,
        }),
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setShowForm(false);
        setFormData({
          name: '',
          gender: '',
          profession: '',
          phone_number: '',
          email: '',
          location_preference: '',
          needs_directions: false,
          notes: '',
        });
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'failed to register for event';
        setSubmitError(errorMessage);
        
        if (errorMessage.includes('already been registered')) {
          setFormData(prev => ({ ...prev, email: '' }));
        }
      }
    } catch {
      setSubmitError('failed to submit registration. please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className={styles.shell}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p>loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={styles.shell}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <h1>event not found</h1>
          <Link href="/events" style={{ color: '#F16F64', textDecoration: 'underline' }}>
            back to events
          </Link>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className={styles.shell} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className={styles.navbar}>
          <div className={styles.navInner}>
            <Link href="/" className={styles.brand}>
              <Image
                src="/logos/SWAY-Primary-logo-(iteration).png"
                alt="Spinwellness & Yoga"
                width={1260}
                height={360}
                priority
                quality={95}
                style={{ background: 'transparent' }}
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

        <main className={styles.main} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ 
            maxWidth: '600px',
            width: '100%',
            padding: '3rem 2rem', 
            textAlign: 'center', 
            background: 'linear-gradient(135deg, #ffffff 0%, #fef9f5 100%)',
            borderRadius: '20px',
            boxShadow: '0 8px 24px rgba(241, 111, 100, 0.15)',
            border: '2px solid #f16f64',
            color: '#151B47'
          }}>
            <div style={{ 
              fontSize: '3rem', 
              marginBottom: '1rem',
              color: '#f16f64',
              width: '60px',
              height: '60px',
              margin: '0 auto 1rem',
              borderRadius: '50%',
              background: 'rgba(241, 111, 100, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>✓</div>
            <h3 style={{ color: '#151B47', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '600' }}>registration successful!</h3>
            <p style={{ color: '#322216', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              we&apos;ve received your registration. you&apos;ll receive a confirmation email shortly with your ticket details.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <Link
                href="/events"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 2rem',
                  background: '#f16f64',
                  color: 'white',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  textDecoration: 'none',
                  width: '100%',
                  maxWidth: '300px',
                }}
              >
                back to events
              </Link>
              <Link
                href={`/events/${eventId}`}
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 2rem',
                  background: 'transparent',
                  color: '#f16f64',
                  border: '2px solid #f16f64',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  textDecoration: 'none',
                  width: '100%',
                  maxWidth: '300px',
                }}
              >
                view event details
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const registeredCount = event.registrations?.length || 0;
  const spotsRemaining = event.capacity > 0 ? event.capacity - registeredCount : null;

  return (
    <div className={styles.shell} style={{ position: 'relative', overflow: showForm ? 'hidden' : 'auto' }}>
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

      <main className={styles.main} style={{ opacity: showForm ? 0.3 : 1, transition: 'opacity 0.3s ease', pointerEvents: showForm ? 'none' : 'auto' }}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <Link href="/events" style={{ color: '#F16F64', textDecoration: 'underline', marginBottom: '1rem', display: 'inline-block' }}>
                ← back to events
              </Link>
              <h1 className={styles.heroTitle}>{capitalizeWords(event.name)}</h1>
              <div style={{ fontSize: '1.1rem', color: '#322216', marginTop: '1rem' }}>
                <p><strong>{capitalizeWords('date')}:</strong> {formatDate(event.start_date)}</p>
                <p><strong>{capitalizeWords('location')}:</strong> {capitalizeWords(event.location)}</p>
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
                {event.venue && <p><strong>{capitalizeWords('venue')}:</strong> {capitalizeWords(event.venue)}</p>}
                {spotsRemaining !== null && (
                  <p><strong>{capitalizeWords('spots available')}:</strong> {spotsRemaining} of {event.capacity}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: window.innerWidth > 900 ? '1fr 1fr' : '1fr', 
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
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #ffffff 0%, #fef9f5 100%)', 
              borderRadius: '20px', 
              padding: '2rem', 
              boxShadow: '0 4px 20px rgba(21, 27, 71, 0.05)',
              border: '1px solid rgba(241, 111, 100, 0.1)',
              opacity: spotsRemaining !== null && spotsRemaining <= 0 ? 0.6 : 1,
            }}>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: '#151B47' }}>{capitalizeWords('register')}</h2>
              {spotsRemaining !== null && spotsRemaining <= 0 ? (
                <>
                  <p style={{ color: '#f16f64', marginBottom: '1.5rem', lineHeight: '1.6', fontWeight: '600', fontSize: '1.1rem' }}>
                    this event is sold out. thank you for your interest!
                  </p>
                  <button
                    disabled
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: '#DFD9D4',
                      color: '#999',
                      border: 'none',
                      borderRadius: '25px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'not-allowed',
                      opacity: 0.5,
                      filter: 'blur(0.5px)',
                    }}
                  >
                    sold out
                  </button>
                </>
              ) : (
                <>
                  <p style={{ color: '#322216', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    ready to join us? click the button below to register for this event.
                  </p>
                  <button
                    onClick={() => setShowForm(true)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: '#F16F64',
                      color: 'white',
                      border: 'none',
                      borderRadius: '25px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    register now
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {showForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          overflowY: 'auto',
        }} onClick={() => !submitting && setShowForm(false)}>
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fef9f5 100%)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            position: 'relative',
          }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowForm(false)}
              disabled={submitting}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                color: '#151B47',
                cursor: submitting ? 'not-allowed' : 'pointer',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!submitting) e.currentTarget.style.background = 'rgba(21, 27, 71, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              ×
            </button>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: '#151B47', paddingRight: '2rem' }}>register</h2>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#151B47', fontWeight: '600', fontSize: '1rem' }}>
                  name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '1px solid #DFD9D4',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f16f64';
                    e.target.style.boxShadow = '0 0 0 3px rgba(241, 111, 100, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#DFD9D4';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#151B47', fontWeight: '600', fontSize: '1rem' }}>
                  gender *
                </label>
                <select
                  required
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '1px solid #DFD9D4',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f16f64';
                    e.target.style.boxShadow = '0 0 0 3px rgba(241, 111, 100, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#DFD9D4';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">select gender</option>
                  <option value="female">female</option>
                  <option value="male">male</option>
                  <option value="non-binary">non-binary</option>
                  <option value="prefer-not-to-say">prefer not to say</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#151B47', fontWeight: '600', fontSize: '1rem' }}>
                  profession *
                </label>
                <input
                  type="text"
                  required
                  value={formData.profession}
                  onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '1px solid #DFD9D4',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f16f64';
                    e.target.style.boxShadow = '0 0 0 3px rgba(241, 111, 100, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#DFD9D4';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#151B47', fontWeight: '600', fontSize: '1rem' }}>
                  phone number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone_number}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  minLength={10}
                  maxLength={15}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: validationErrors.phone_number ? '2px solid #f16f64' : '1px solid #DFD9D4',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f16f64';
                    e.target.style.boxShadow = '0 0 0 3px rgba(241, 111, 100, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = validationErrors.phone_number ? '#f16f64' : '#DFD9D4';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {validationErrors.phone_number && (
                  <p style={{ color: '#f16f64', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    {validationErrors.phone_number}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#151B47', fontWeight: '600', fontSize: '1rem' }}>
                  email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '1px solid #DFD9D4',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f16f64';
                    e.target.style.boxShadow = '0 0 0 3px rgba(241, 111, 100, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#DFD9D4';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#151B47', fontWeight: '600', fontSize: '1rem' }}>
                  location preference *
                </label>
                <select
                  required
                  value={formData.location_preference}
                  onChange={(e) => setFormData({ ...formData, location_preference: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '1px solid #DFD9D4',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f16f64';
                    e.target.style.boxShadow = '0 0 0 3px rgba(241, 111, 100, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#DFD9D4';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">select location</option>
                  <option value="lagos">lagos</option>
                  <option value="ibadan">ibadan</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', color: '#151B47', fontWeight: '600', fontSize: '1rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.needs_directions}
                    onChange={(e) => setFormData({ ...formData, needs_directions: e.target.checked })}
                    style={{ marginRight: '0.75rem', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  will you need help with directions?
                </label>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#151B47', fontWeight: '600', fontSize: '1rem' }}>
                  notes <span style={{ fontSize: '0.875rem', fontWeight: '400', color: '#666' }}>(max 200 characters)</span>
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  rows={4}
                  maxLength={200}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: validationErrors.notes ? '2px solid #f16f64' : '1px solid #DFD9D4',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    transition: 'all 0.3s ease',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f16f64';
                    e.target.style.boxShadow = '0 0 0 3px rgba(241, 111, 100, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = validationErrors.notes ? '#f16f64' : '#DFD9D4';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  {validationErrors.notes && (
                    <p style={{ color: '#f16f64', fontSize: '0.875rem', margin: 0 }}>
                      {validationErrors.notes}
                    </p>
                  )}
                  <p style={{ color: '#666', fontSize: '0.875rem', margin: 0, marginLeft: 'auto' }}>
                    {formData.notes.length}/200
                  </p>
                </div>
              </div>

              {submitError && (
                <div style={{ 
                  padding: '1rem 1.25rem', 
                  background: 'linear-gradient(135deg, #f16f64 0%, #e85a50 100%)', 
                  color: 'white', 
                  borderRadius: '12px', 
                  marginBottom: '1.5rem',
                  boxShadow: '0 4px 12px rgba(241, 111, 100, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠</span>
                    <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>{submitError}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: submitting ? '#DFD9D4' : '#F16F64',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                {submitting ? 'submitting...' : 'register now'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
