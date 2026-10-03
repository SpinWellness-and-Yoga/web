'use client';
import BlogShell from './_components/BlogShell';
import styles from './blog.module.css';

export default function BlogError({ reset }: { reset: () => void }) {
  return <BlogShell><main className={styles.main}><div className={styles.empty} role="alert">
    <h2>The journal is temporarily unavailable</h2><p>Please try again shortly.</p>
    <button className={styles.button} onClick={reset}>Try again</button>
  </div></main></BlogShell>;
}
