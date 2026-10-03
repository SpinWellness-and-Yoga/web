import Link from 'next/link';
import Navbar from '@/app/_components/Navbar';
import styles from '../blog.module.css';

export default function BlogShell({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>
    <Navbar className={styles.navigation} />
    {children}
    <footer className={styles.footer}>
      <span>Spinwellness & Yoga</span>
      <span>Wellbeing for people. Space for connection.</span>
      <Link href="/contact">Contact us</Link>
    </footer>
  </div>;
}
