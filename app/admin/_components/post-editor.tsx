'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Post, PostInput, PostStatus } from '../../../lib/cms/types';
import { api, RequestError, useUnsaved } from './api';
import PostFields from './post-fields';
const empty: PostInput = { title: '', slug: '', excerpt: '', body: '', category: '', author: '', cover_url: '', cover_alt: '', status: 'draft', featured: false };
export default function PostEditor({ id }: { id?: string }) {
 const router = useRouter(); const fields = useRef<HTMLFieldSetElement>(null); const [post, setPost] = useState<PostInput>(empty); const [version, setVersion] = useState(0); const [loading, setLoading] = useState(!!id); const [busy, setBusy] = useState(false); const [dirty, setDirty] = useState(false); const [error, setError] = useState(''); const [note, setNote] = useState(''); const [preview, setPreview] = useState(false); const [attempt, setAttempt] = useState(0); useUnsaved(dirty);
 useEffect(() => { if (!id) return; const controller = new AbortController(); setLoading(true); api<Post>(`/api/admin/posts/${id}`, { signal: controller.signal }).then(value => { setPost(value); setVersion(value.version); setDirty(false); setError(''); }).catch(issue => { if (issue.name !== 'AbortError') setError(issue.message); }).finally(() => setLoading(false)); return () => controller.abort(); }, [id, attempt]);
 function change<K extends keyof PostInput>(key: K, value: PostInput[K]) { setPost(current => ({ ...current, [key]: value })); setDirty(true); setNote(''); }
 async function save(status: PostStatus) {
  const invalid = fields.current?.querySelector<HTMLInputElement>(':invalid'); if (invalid) { invalid.reportValidity(); return; }
  setBusy(true); setError(''); setNote('');
  try { const { title, slug, excerpt, body, category, author, cover_url, cover_alt, featured } = post; const saved = await api<Post>(id ? `/api/admin/posts/${id}` : '/api/admin/posts', { method: id ? 'PATCH' : 'POST', body: JSON.stringify({ title, slug, excerpt, body, category, author, cover_url, cover_alt, featured, status, ...(id ? { version } : {}) }) }); setPost(saved); setVersion(saved.version); setDirty(false); setNote(status === 'published' ? 'Post published.' : 'Changes saved.'); if (!id) router.replace(`/admin/posts/${saved.id}`); }
  catch (issue) { setError(issue instanceof RequestError && issue.status === 409 ? 'This post changed in another session. Copy your changes before you reload.' : (issue as Error).message); } finally { setBusy(false); }
 }
 if (loading) return <p role="status">Loading post…</p>;
 return <><div className="studio-heading"><div><Link href="/admin/posts">Back to blog posts</Link><h1>{id ? 'Edit your story' : 'A new story'}</h1><p className="muted">Write, review, and share something useful.</p></div><div className="studio-actions"><button className="button" disabled={busy} onClick={() => setPreview(!preview)}>{preview ? 'Back to editor' : 'Preview'}</button><button className="button primary" disabled={busy || (!!id && !version)} onClick={() => save(post.status)}>{busy ? 'Saving…' : post.status === 'draft' ? 'Save draft' : 'Save changes'}</button></div></div>{error && <div className="notice error" role="alert">{error}{id && <button className="link-button" onClick={() => { if (!dirty || window.confirm('Discard your changes and load the saved post?')) setAttempt(value => value + 1); }}>Reload saved post</button>}</div>}<p role="status" className="muted">{note || (dirty ? 'Unsaved changes' : '')}</p>{preview && <article className="preview panel"><span className="eyebrow">Private preview · {post.category}</span><h1>{post.title || 'Untitled story'}</h1><p>{post.excerpt}</p><p className="muted">{post.author}</p>{post.cover_url && <Image unoptimized width={1000} height={600} src={post.cover_url} alt={post.cover_alt} />}{post.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article>}<fieldset hidden={preview} ref={fields} disabled={busy || (!!id && !version)} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><PostFields post={post} change={change} save={save} busy={busy} /></fieldset></>;
}
