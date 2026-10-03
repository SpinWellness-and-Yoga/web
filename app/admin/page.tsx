'use client';
import Link from 'next/link';
import type { Overview } from '../../lib/cms/types';
import { useResource } from './_components/api';
import PostTable from './_components/post-table';
export default function Dashboard() {
 const { data, error, reload } = useResource<Overview>('/api/admin/overview');
 return <><div className="studio-heading"><div><span className="eyebrow">Your content studio</span><h1>Welcome back.</h1><p className="muted">Manage the stories and experiences you share.</p></div><Link className="button primary" href="/admin/posts/new">Create a post</Link></div>{error && <p className="notice error" role="alert">{error} <button className="button" onClick={reload}>Try again</button></p>}{!data && !error && <p role="status">Loading your overview…</p>}{data && <><div className="stats">{[['Published stories', data.published_posts], ['Drafts', data.draft_posts], ['Active events', data.active_events]].map(([label, value]) => <div className="panel stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="studio-heading"><h2>Recent stories</h2><Link href="/admin/posts">All posts</Link></div><PostTable posts={data.recent_posts} /><div className="panel" style={{ marginTop: 30 }}><h2>Keep your website up to date</h2><p className="muted">Update your team, services, and answers to common questions.</p><Link className="button" href="/admin/content">Edit website content</Link></div></>}</>;
}
