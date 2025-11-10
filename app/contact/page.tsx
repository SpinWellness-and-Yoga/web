'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

type FormState = {
  name: string;
  email: string;
  message: string;
};

const initialState: FormState = {
  name: '',
  email: '',
  message: '',
};

export default function ContactPage() {
  const [formData, setFormData] = useState<FormState>(initialState);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [feedback, setFeedback] = useState('');

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setFeedback('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setStatus('success');
      setFeedback('Thank you! Your message has been sent. We&apos;ll get back to you soon.');
      setFormData(initialState);
    } catch (error) {
      console.error('Contact form error', error);
      setStatus('error');
      setFeedback('Something went wrong. Please try again.');
    }
  };

  return (
    <div className={styles.shell}>
      <header className={styles.navbar}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand}>
            <Image
              src="/logos/SWAY-Alt-logo-PNG.png"
              alt="Spinwellness & Yoga"
              width={300}
              height={100}
              priority
            />
          </Link>
          <nav className={styles.navLinks} aria-label="Primary">
            <Link href="/#services">Services</Link>
            <Link href="/#why">Why Us</Link>
            <Link href="/#waitlist">Waitlist</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>Get in Touch</span>
              <h1 className={styles.heroTitle}>Let&apos;s transform workplace wellness together</h1>
              <p className={styles.heroBody}>
                Have questions about our corporate wellness programs? Want to learn how we can support your team? 
                We&apos;d love to hear from you.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.formSection}>
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>Send us a message</h2>
            {feedback && (
              <p className={styles.feedback} data-status={status}>
                {feedback}
              </p>
            )}
            <form className={styles.contactForm} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@company.com"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your team's wellness needs..."
                  rows={6}
                  required
                />
              </div>
              <button type="submit" disabled={status === 'loading'} className={styles.submitButton}>
                {status === 'loading' ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Image
              src="/logos/SWAY-Alt-logo-PNG.png"
              alt="Spinwellness logomark"
              width={180}
              height={250}
            />
            <p>Spinwellness & Yoga — wellness, therapy, and culture design for modern teams.</p>
          </div>
          <div className={styles.footerMeta}>
            <span>© {new Date().getFullYear()} Spinwellness & Yoga. All rights reserved.</span>
            <span>Launching globally · Rooted in Lagos & evergreen calm.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

