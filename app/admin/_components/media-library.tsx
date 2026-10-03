'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { MEDIA_CATEGORIES, type MediaAsset, type MediaCategory } from '../../../lib/cms/types';
import { api, useResource } from './api';
import Pagination from './pagination';
const categories = Object.entries(MEDIA_CATEGORIES) as [MediaCategory, string][];
const options = categories.map(([value, label]) => <option key={value} value={value}>{label}</option>);
export default function MediaLibrary({ onSelect }: { onSelect?: (asset: MediaAsset) => void }) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<MediaCategory | ''>(''); const [category, setCategory] = useState<MediaCategory>('general');
  const { data, error, reload } = useResource<MediaAsset[]>(`/api/admin/media?limit=50&offset=${page * 50}${filter ? `&category=${filter}` : ''}`);
  const file = useRef<HTMLInputElement>(null); const [alt, setAlt] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  async function upload(event: React.FormEvent) { event.preventDefault(); const selected = file.current?.files?.[0]; if (!selected) return; setMessage('');
    if (selected.size > 5 * 1024 * 1024) { setMessage('Select an image smaller than 5 MB.'); return; }
    setBusy(true); const body = new FormData(); body.append('file', selected); body.append('alt', alt); body.append('category', category);
    try { const asset = await api<MediaAsset>('/api/admin/media', { method: 'POST', body }); setAlt(''); if (file.current) file.current.value = ''; setPage(0); reload(); setMessage('Image uploaded.'); onSelect?.(asset); }
    catch (issue) { setMessage((issue as Error).message); } finally { setBusy(false); }
  }
  async function move(asset: MediaAsset, next: MediaCategory) { setMessage('');
    try { await api(`/api/admin/media/${asset.id}`, { method: 'PATCH', body: JSON.stringify({ category: next }) }); reload(); }
    catch (issue) { setMessage((issue as Error).message); }
  }
  return <><form className="panel" onSubmit={upload}><h2>Upload an image</h2><p className="muted">JPEG, PNG, or WebP. Maximum size: 5 MB.</p><p className="muted">Uploaded images are public. Do not upload private information.</p><label>Image file<input ref={file} type="file" accept="image/jpeg,image/png,image/webp" required /></label><label>Image description<input value={alt} onChange={event => setAlt(event.target.value)} maxLength={240} required /></label><label>Category<select value={category} onChange={event => setCategory(event.target.value as MediaCategory)}>{options}</select></label><button className="button primary" disabled={busy}>{busy ? 'Uploading…' : 'Upload image'}</button><p role="status">{message}</p></form><div className="filters"><label>Show category<select value={filter} onChange={event => { setFilter(event.target.value as MediaCategory | ''); setPage(0); }}><option value="">All categories</option>{options}</select></label></div>{error && <p className="notice error" role="alert">{error} <button className="button" onClick={reload}>Try again</button></p>}{!data && !error && <p role="status">Loading images…</p>}{data?.length === 0 && <div className="empty">{filter ? 'No images in this category.' : 'No images uploaded yet.'}</div>}<div className="media-grid">{data?.map(asset => <div className="media-card" key={asset.id}><Image unoptimized width={360} height={280} src={asset.url} alt={asset.alt} loading="lazy" /><p>{asset.name}</p><p>{asset.alt}</p><label>Category<select value={asset.category} onChange={event => move(asset, event.target.value as MediaCategory)}>{options}</select></label>{onSelect && <button className="button" onClick={() => onSelect(asset)}>Use image</button>}</div>)}</div>{data && <Pagination page={page} count={data.length} change={setPage} />}</>;
}
export function ImageField({ url, alt, onChange }: { url: string; alt: string; onChange: (url: string, alt: string) => void }) {
  const [open, setOpen] = useState(false); const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  return <div>{url && <Image unoptimized width={520} height={320} className="cover" src={url} alt={alt} />}<div className="studio-actions"><button type="button" className="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>Choose image</button>{url && <button type="button" className="link-button" onClick={() => onChange('', '')}>Remove image</button>}</div><dialog ref={dialog} className="media-dialog" aria-label="Choose an image" onCancel={() => setOpen(false)}><div className="studio-heading"><h2>Choose an image</h2><button type="button" className="button" onClick={() => setOpen(false)}>Close</button></div>{open && <MediaLibrary onSelect={asset => { onChange(asset.url, asset.alt); setOpen(false); }} />}</dialog></div>;
}
