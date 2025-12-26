import Link from 'next/link';
import Navbar from './_components/Navbar';
import styles from './page.module.css';

export default function NotFound() {
  return (
    <div className={styles.shell}>
      <Navbar />
      <main className={styles.main} style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '600px', textAlign: 'center', padding: '3rem 2rem' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#151B47' }}>404</h1>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#322216' }}>page not found</h2>
          <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
            the page you are looking for does not exist or has been moved.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '1rem 2rem',
              background: '#f16f64',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '25px',
              fontSize: '1rem',
              fontWeight: '600',
            }}
          >
            back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

