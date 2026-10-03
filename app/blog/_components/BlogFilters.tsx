import Link from 'next/link';
import { blogHref } from '@/lib/blog-display';
import styles from '../blog.module.css';

type Props = { query: string; category: string; categories: string[] };
export default function BlogFilters({ query, category, categories }: Props) {
  return <div className={styles.filters}>
    <nav className={styles.categories} aria-label="Article categories">
      <Link className={`${styles.category} ${!category ? styles.selected : ''}`} href={blogHref(query, '')}
        aria-current={!category ? 'page' : undefined}>All stories</Link>
      {categories.map(item => <Link key={item} className={`${styles.category} ${category === item ? styles.selected : ''}`}
        href={blogHref(query, item)} aria-current={category === item ? 'page' : undefined}>{item}</Link>)}
    </nav>
    <form action="/blog" className={styles.search} role="search">
      <input type="search" name="q" aria-label="Search stories" placeholder="Search stories" defaultValue={query} maxLength={100} />
      {category && <input type="hidden" name="category" value={category} />}
      <button type="submit">Search</button>
    </form>
  </div>;
}
