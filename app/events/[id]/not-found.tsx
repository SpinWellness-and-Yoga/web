import Link from 'next/link';
import styles from '../../page.module.css';
import Navbar from '@/app/_components/Navbar';

export default function NotFound() {
  return (
    <div className={styles.shell}>
      <Navbar />
      <main className={styles.main} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#151B47' }}>event not found</h1>
          <p style={{ color: '#322216', marginBottom: '2rem' }}>
            the event you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link 
            href="/events" 
            style={{ 
              color: '#F16F64', 
              textDecoration: 'underline',
              fontSize: '1.1rem',
              fontWeight: '600'
            }}
          >
            ← back to events
          </Link>
        </div>
      </main>
    </div>
  );
}

