'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Post } from '../../../lib/cms/types';
import { useResource } from '../_components/api';
import PostTable from '../_components/post-table';
import Pagination from '../_components/pagination';
export default function Posts() {
 const [search, setSearch] = useState(''); const [query, setQuery] = useState(''); const [status, setStatus] = useState('all'); const [page, setPage] = useState(0);
 useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(0); }, 250); return () => clearTimeout(timer); }, [search]);
 const { data, error, reload } = useResource<Post[]>(`/api/admin/posts?limit=50&offset=${page * 50}&q=${encodeURIComponent(query)}&status=${status}`);
 return <><div className="studio-heading"><div><span className="eyebrow">Words that make a difference</span><h1>Blog posts</h1><p className="muted">Your stories, from the first draft to publication.</p></div><Link className="button primary" href="/admin/posts/new">Create a post</Link></div><div className="filters"><label>Search posts<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label><label>Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}><option value="all">All posts</option><option value="draft">Drafts</option><option value="published">Published</option><option value="archived">Archived</option></select></label></div>{error && <p className="notice error" role="alert">{error} <button className="button" onClick={reload}>Try again</button></p>}{!data && !error && <p role="status">Loading posts…</p>}{data && <><PostTable posts={data} /><Pagination page={page} count={data.length} change={setPage} /></>}</>;
}
