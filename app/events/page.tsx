import Navbar from '../_components/Navbar';
import EventsList from './_components/EventsList';
import styles from '../page.module.css';
import { capitalizeWords } from '@/lib/utils';
import { getAllEventsWithCounts } from '@/lib/events-storage';

export const revalidate = 180;

export default async function EventsPage() {
  const events = await getAllEventsWithCounts();

  return (
    <div className={styles.shell}>
      <Navbar />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>{capitalizeWords('upcoming events')}</span>
              <h1 className={styles.heroTitle}>{capitalizeWords('join our wellness events')}</h1>
              <p className={styles.heroBody}>
                {capitalizeWords('experience transformative yoga, meditation, and wellness workshops designed to nourish your mind, body, and spirit.')}
              </p>
            </div>
          </div>
        </section>

        <EventsList events={events} />
      </main>
    </div>
  );
}