import { readSiteContent } from '@/lib/site-content';
import Navbar from '../_components/Navbar';
import styles from '../page.module.css';
import { capitalizeWords } from '../../lib/utils';


export const dynamic = 'force-dynamic';

export default async function FAQPage() {
  const { items: faqs } = await readSiteContent('faq');
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




