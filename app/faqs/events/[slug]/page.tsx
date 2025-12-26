import Link from 'next/link';
import Navbar from '../../../_components/Navbar';
import styles from '../../../page.module.css';
import { capitalizeWords } from '../../../../lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'is this event beginner friendly?',
    answer: 'absolutely. whether you\'ve practiced yoga for years or have never stepped on a mat, our sessions are designed for all levels.',
  },
  {
    question: 'what should i wear?',
    answer: 'wear comfortable, breathable clothing that allows you to move freely (leggings, joggers, or loose athletic wear).',
  },
  {
    question: 'do i need to bring anything along?',
    answer: 'just yourself and an open heart. we provide yoga mats, water, and refreshments for everyone.',
  },
  {
    question: 'what should i expect?',
    answer: 'you can expect a gentle, holistic 2-hour experience. we\'ll begin with 45 minutes of mindful yoga, followed by 15 minutes of deep relaxation with sound bowls. we\'ll wrap up with light refreshments and an open conversation on recommitting to your wellbeing in a safe environment.',
  },
  {
    question: 'can i come without a ticket?',
    answer: 'to maintain an intimate and safe environment, we have a strict capacity of 20 people per event. therefore, we cannot accommodate walk-ins. please ensure you have a confirmed ticket before arriving. if you missed out, stay tuned to our social media for future events.',
  },
];

export default async function EventFAQPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  const location = slug.includes('lagos') ? 'lagos' : slug.includes('ibadan') ? 'ibadan' : '';
  const eventTitle = location 
    ? `recommit to your wellbeing - ${location} edition`
    : 'recommit to your wellbeing';

  return (
    <div className={styles.shell}>
      <Navbar />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>frequently asked questions</span>
              <h1 className={styles.heroTitle}>{capitalizeWords(eventTitle)}</h1>
              <p className={styles.heroBody}>
                {capitalizeWords('find answers to common questions about this event.')}
              </p>
            </div>
          </div>
        </section>

        <section className={styles.servicesSection}>
          <div className={styles.faqGrid}>
            {faqs.map((faq, index) => (
              <div key={index} className={styles.faqCard}>
                <h3 className={styles.faqQuestion}>{capitalizeWords(faq.question)}</h3>
                <p className={styles.faqAnswer}>{capitalizeWords(faq.answer)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.ctaSection}>
          <h2>{capitalizeWords('still have questions?')}</h2>
          <p>{capitalizeWords('reach out to us and we will be happy to help.')}</p>
          <a href="/contact" className={styles.ctaButton}>
            contact us
          </a>
        </section>
      </main>
    </div>
  );
}

