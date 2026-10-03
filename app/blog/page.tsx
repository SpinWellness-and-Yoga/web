import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedPosts } from '@/lib/cms/public';
import { blogHref, blogQuery } from '@/lib/blog-display';
import BlogShell from './_components/BlogShell';
import BlogFilters from './_components/BlogFilters';
import PostCard, { FeaturedPost } from './_components/PostCard';
import styles from './blog.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'The Spinwellness journal | Spinwellness & Yoga',
  description: 'Stories about workplace wellbeing, mindful movement, and everyday wellness.', alternates: { canonical: '/blog' } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function BlogPage({ searchParams }: Props) {
  const { query, category, page } = blogQuery(await searchParams);
  const { posts, total, categories } = await getPublishedPosts({ query, category, page });
  const featured = !query && !category && page === 1 ? posts.find(post => post.featured) : undefined;
  return <BlogShell><main className={styles.main}>
    <header className={styles.intro}><span className={styles.eyebrow}>The Spinwellness journal</span>
      <h1>A little space for<br />your wellbeing.</h1><p>Ideas for a calmer workday, mindful movement, and a little more room for yourself.</p></header>
    {featured && <FeaturedPost post={featured} />}
    <BlogFilters query={query} category={category} categories={categories} />
    {posts.length ? <div className={styles.grid}>{posts.filter(post => post.id !== featured?.id).map(post => <PostCard key={post.id} post={post} />)}</div>
      : <div className={styles.empty}><h2>{query || category || page > 1 ? 'No stories found' : 'Our journal opens soon'}</h2>
        <p>{query || category || page > 1 ? 'Try another search or explore all stories.' : 'New stories will appear here when they are published.'}</p>
        <Link className={styles.readLink} href={query || category || page > 1 ? '/blog' : '/events'}>{query || category || page > 1 ? 'All stories' : 'Explore our events'} →</Link></div>}
    <nav className={styles.pagination} aria-label="Blog pages">
      {page > 1 && <Link href={blogHref(query, category, page - 1)}>← Previous</Link>}
      {total > 0 && <span>Page {page} of {Math.max(1, Math.ceil(total / 12))}</span>}
      {page * 12 < total && <Link href={blogHref(query, category, page + 1)}>Next →</Link>}
    </nav>
  </main></BlogShell>;
}
