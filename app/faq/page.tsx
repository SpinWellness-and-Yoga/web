import React from 'react';
import Navbar from '../_components/Navbar';
import styles from '../page.module.css';
import { capitalizeWords } from '../../lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'what should i bring to the event?',
    answer: 'please bring a yoga mat, water bottle, and comfortable clothing. we provide all other equipment and materials needed for the session.',
  },
  {
    question: 'do i need prior yoga experience to attend?',
    answer: 'no prior experience is necessary. our events are designed for all levels, from beginners to advanced practitioners. our instructors will guide you through each practice.',
  },
  {
    question: 'can i cancel my registration?',
    answer: 'yes, you can cancel your registration up to 24 hours before the event. please use the cancellation link in your confirmation email or contact us directly.',
  },
  {
    question: 'what happens if an event is sold out?',
    answer: 'if an event is sold out, you can join our waitlist. we will notify you if a spot becomes available. you can also check back regularly as cancellations may open up spaces.',
  },
  {
    question: 'are the events suitable for people with injuries?',
    answer: 'please inform us of any injuries or health concerns when registering. our instructors can provide modifications for most conditions, but we recommend consulting with your healthcare provider first.',
  },
  {
    question: 'how long are the events?',
    answer: 'our wellness events typically last 90 minutes, including a brief introduction, the main practice, and a closing meditation or reflection period.',
  },
  {
    question: 'is parking available at the venue?',
    answer: 'parking availability varies by location. lagos events are held at alpha fitness studios with parking available. ibadan events at tya with nio studios also have parking. we will send detailed directions in your confirmation email.',
  },
  {
    question: 'what is your refund policy?',
    answer: 'full refunds are available for cancellations made at least 48 hours before the event. cancellations within 24-48 hours receive a 50% refund. no refunds for same-day cancellations.',
  },
];

export default function FAQPage() {
  return (
    <div className={styles.shell}>
      <Navbar />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>frequently asked questions</span>
              <h1 className={styles.heroTitle}>{capitalizeWords('event information')}</h1>
              <p className={styles.heroBody}>
                {capitalizeWords('find answers to common questions about our wellness events, registration, and what to expect.')}
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


