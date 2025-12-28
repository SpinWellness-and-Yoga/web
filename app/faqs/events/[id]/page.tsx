import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/_components/Navbar';
import styles from '@/app/page.module.css';
import { capitalizeWords } from '@/lib/utils';
import { getEventByIdWithCount } from '@/lib/events-storage';

export const revalidate = 60;

export default async function EventFAQPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventByIdWithCount(id);

  if (!event) {
    notFound();
  }

  return (
    <div className={styles.shell}>
      <Navbar />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <Link href={`/events/${event.id}`} style={{ color: '#F16F64', textDecoration: 'underline', marginBottom: '1rem', display: 'inline-block' }}>
                ← back to event details
              </Link>
              <span className={styles.kicker}>frequently asked questions</span>
              <h1 className={styles.heroTitle}>{capitalizeWords(event.name)}</h1>
              <p className={styles.heroBody}>
                {capitalizeWords('find answers to common questions about this event.')}
              </p>
            </div>
          </div>
        </section>

        <section className={styles.servicesSection}>
          <div className={styles.faqGrid}>
            <div className={styles.faqCard}>
              <h3 className={styles.faqQuestion}>{capitalizeWords('is this event beginner friendly?')}</h3>
              <p className={styles.faqAnswer}>
                {capitalizeWords('absolutely. whether you\'ve practiced yoga for years or have never stepped on a mat, our sessions are designed for all levels.')}
              </p>
            </div>
            <div className={styles.faqCard}>
              <h3 className={styles.faqQuestion}>{capitalizeWords('what should i wear?')}</h3>
              <p className={styles.faqAnswer}>
                {capitalizeWords('wear comfortable, breathable clothing that allows you to move freely (leggings, joggers, or loose athletic wear).')}
              </p>
            </div>
            <div className={styles.faqCard}>
              <h3 className={styles.faqQuestion}>{capitalizeWords('do i need to bring anything along?')}</h3>
              <p className={styles.faqAnswer}>
                {capitalizeWords('just yourself and an open heart. we provide yoga mats, water, and refreshments for everyone.')}
              </p>
            </div>
            <div className={styles.faqCard}>
              <h3 className={styles.faqQuestion}>{capitalizeWords('what should i expect?')}</h3>
              <p className={styles.faqAnswer}>
                {capitalizeWords('you can expect a gentle, holistic 2-hour experience. we\'ll begin with 45 minutes of mindful yoga, followed by 15 minutes of deep relaxation with sound bowls. we\'ll wrap up with light refreshments and an open conversation on recommitting to your wellbeing in a safe environment.')}
              </p>
            </div>
            <div className={styles.faqCard}>
              <h3 className={styles.faqQuestion}>{capitalizeWords('can i come without a ticket?')}</h3>
              <p className={styles.faqAnswer}>
                {capitalizeWords('to maintain an intimate and safe environment, we have a strict capacity of 20 people per event. therefore, we cannot accommodate walk-ins. please ensure you have a confirmed ticket before arriving. if you missed out, stay tuned to our social media for future events.')}
              </p>
            </div>
          </div>
        </section>

        <section className={styles.ctaSection}>
          <h2>{capitalizeWords('still have questions?')}</h2>
          <p>{capitalizeWords('reach out to us and we will be happy to help.')}</p>
          <Link href="/contact" className={styles.ctaButton}>
            contact us
          </Link>
        </section>
      </main>
    </div>
  );
}

