import Image from 'next/image';
import Link from 'next/link';
import type { Post } from '@/lib/cms/types';
import { blogDate, readingMinutes } from '@/lib/blog-display';
import styles from '../blog.module.css';

export function PostCover({ post, priority = false }: { post: Post; priority?: boolean }) {
  return <div className={styles.cover}>
    <Image src={post.cover_url || '/stock/quiet-morning.webp'} alt={post.cover_url ? post.cover_alt : ''}
      fill sizes="(max-width: 720px) 100vw, 50vw" priority={priority} unoptimized={!!post.cover_url} />
  </div>;
}

export function PostMeta({ post }: { post: Post }) {
  return <div className={styles.meta}>
    {post.author} · {readingMinutes(post.body)} min read
    {post.published_at && <> · <time dateTime={post.published_at}>{blogDate(post.published_at)}</time></>}
  </div>;
}

export default function PostCard({ post }: { post: Post }) {
  return <article className={styles.card}>
    <Link href={`/blog/${post.slug}`} aria-label={`Read ${post.title}`}><PostCover post={post} /></Link>
    <span className={styles.eyebrow}>{post.category}</span>
    <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
    <PostMeta post={post} />
  </article>;
}

export function FeaturedPost({ post }: { post: Post }) {
  return <article className={styles.featured}>
    <PostCover post={post} priority />
    <div className={styles.featuredCopy}>
      <span className={styles.eyebrow}>Featured · {post.category}</span>
      <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
      <p>{post.excerpt}</p><PostMeta post={post} />
      <Link className={styles.readLink} href={`/blog/${post.slug}`}>Read the story →</Link>
    </div>
  </article>;
}
