import Link from 'next/link';
import BlogShell from '../_components/BlogShell';
import styles from '../blog.module.css';
export default function StoryNotFound() {
  return <BlogShell><main className={styles.main}><div className={styles.empty}>
    <h2>Story not found</h2><p>This story is not available.</p><Link className={styles.readLink} href="/blog">Explore the journal →</Link>
  </div></main></BlogShell>;
}
