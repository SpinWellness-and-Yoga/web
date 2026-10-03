import BlogShell from './_components/BlogShell';
import styles from './blog.module.css';
export default function Loading() {
  return <BlogShell><main className={styles.main}><p className={styles.empty} role="status">Loading stories…</p></main></BlogShell>;
}
