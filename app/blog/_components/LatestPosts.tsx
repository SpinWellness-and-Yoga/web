import Link from 'next/link';
import { getPublishedPosts } from '@/lib/cms/public';
import PostCard from './PostCard';
import styles from '../blog.module.css';

export default async function LatestPosts() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const { posts } = await getPublishedPosts();
  if (!posts.length) return null;
  return <section className={styles.homeSection} aria-labelledby="latest-stories">
    <header className={styles.homeHeader}><div><span className={styles.eyebrow}>The journal</span>
      <h2 id="latest-stories">A moment for your wellbeing.</h2></div><Link className={styles.readLink} href="/blog">All stories →</Link></header>
    <div className={styles.grid}>{posts.slice(0, 3).map(post => <PostCard post={post} key={post.id} />)}</div>
  </section>;
}
