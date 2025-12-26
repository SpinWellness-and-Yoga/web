import Link from 'next/link';
import styles from '../page.module.css';

export const metadata = {
  title: 'terms & conditions | spinwellness & yoga',
};

export default function TermsPage() {
  return (
    <div className={styles.shell}>
      <main className={styles.main} style={{ maxWidth: 900 }}>
        <h1 style={{ color: '#151B47', marginBottom: '1rem' }}>terms & conditions</h1>

        <p style={{ color: '#322216' }}>
          by registering for a spinwellness & yoga event, you agree to the terms below.
        </p>

        <h2 style={{ color: '#151B47', marginTop: '2rem' }}>yoga & fitness waiver</h2>
        <ul style={{ color: '#322216', lineHeight: 1.8 }}>
          <li>
            you understand that yoga, fitness, breathwork, and related activities involve physical exertion and carry
            inherent risks (including injury).
          </li>
          <li>
            you confirm you are physically able to participate and will stop if you feel pain, dizziness, or discomfort.
          </li>
          <li>
            you agree to consult a medical professional if you have any health concerns, injuries, pregnancy, or
            conditions that may affect your participation.
          </li>
          <li>
            you assume full responsibility for your participation and release spinwellness & yoga, its facilitators, and
            partners from liability to the fullest extent permitted by law.
          </li>
        </ul>

        <h2 style={{ color: '#151B47', marginTop: '2rem' }}>photo & media release</h2>
        <ul style={{ color: '#322216', lineHeight: 1.8 }}>
          <li>
            you consent to being photographed and/or recorded during the event.
          </li>
          <li>
            you grant spinwellness & yoga permission to use your image, likeness, and any captured media for promotional,
            marketing, and informational purposes (including social media, website, and other materials), without
            compensation.
          </li>
        </ul>

        <h2 style={{ color: '#151B47', marginTop: '2rem' }}>general</h2>
        <ul style={{ color: '#322216', lineHeight: 1.8 }}>
          <li>you agree to follow facilitator instructions and respect other participants.</li>
          <li>spinwellness & yoga may update these terms from time to time.</li>
        </ul>

        <div style={{ marginTop: '2.5rem' }}>
          <Link href="/events" style={{ color: '#F16F64', textDecoration: 'underline' }}>
            back to events
          </Link>
        </div>
      </main>
    </div>
  );
}






