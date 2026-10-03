import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedPost, getPublishedPosts } from '@/lib/cms/public';
import BlogShell from '../_components/BlogShell';
import PostCard, { PostCover, PostMeta } from '../_components/PostCard';
import styles from '../blog.module.css';

export const dynamic = 'force-dynamic';
const getPost = cache(getPublishedPost);
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: 'Story not found', robots: { index: false, follow: false } };
  return { title: `${post.title} | Spinwellness & Yoga`, description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.excerpt, type: 'article',
      publishedTime: post.published_at || undefined, authors: [post.author],
      images: post.cover_url ? [{ url: post.cover_url, alt: post.cover_alt }] : ['/brand/sway-pattern.webp'] } };
}

export default async function ArticlePage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const related = (await getPublishedPosts({ category: post.category, page: 1 })).posts.filter(item => item.id !== post.id).slice(0, 3);
  return <BlogShell><main>
    <article className={styles.article}><Link className={styles.readLink} href="/blog">← All stories</Link>
      <span className={styles.eyebrow}>{post.category}</span><h1>{post.title}</h1>
      <p className={styles.lede}>{post.excerpt}</p><PostMeta post={post} /><PostCover post={post} priority />
      <div className={styles.body}>{post.body.split(/\n\s*\n/u).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      <Link className={styles.readLink} href="/events">Explore our wellness events →</Link>
    </article>
    {related.length > 0 && <section className={`${styles.main} ${styles.related}`} aria-labelledby="related-heading">
      <h2 id="related-heading">More from the journal</h2><div className={styles.grid}>{related.map(item => <PostCard key={item.id} post={item} />)}</div>
    </section>}
  </main></BlogShell>;
}
