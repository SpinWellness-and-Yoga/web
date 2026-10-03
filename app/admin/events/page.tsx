'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Pagination from '../_components/pagination';
import type { CmsEvent } from '../../../lib/cms/types';
import { date, useResource } from '../_components/api';
export default function Events() {
 const [search, setSearch] = useState(''); const [query, setQuery] = useState(''); const [page, setPage] = useState(0);
 useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(0); }, 250); return () => clearTimeout(timer); }, [search]);
 const { data: events, error, reload } = useResource<CmsEvent[]>(`/api/admin/events?limit=50&offset=${page * 50}&q=${encodeURIComponent(query)}`);
 return <><div className="studio-heading"><div><span className="eyebrow">Shared experiences</span><h1>Events</h1><p className="muted">Manage dates, visibility, and available places.</p></div><Link className="button primary" href="/admin/events/new">Create an event</Link></div><label>Search events<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>{error && <p className="notice error" role="alert">{error} <button className="button" onClick={reload}>Try again</button></p>}{!events && !error && <p role="status">Loading events…</p>}{events?.length === 0 && <div className="empty">No events to show.</div>}{!!events?.length && <div className="table-wrap"><table><thead><tr><th>Event</th><th>Date</th><th>Registrations</th><th>Visibility</th><th>Action</th></tr></thead><tbody>{events.map(event => <tr key={event.id}><td>{event.name}<small>{event.location}</small></td><td>{date(event.start_date)}</td><td>{event.registration_count} / {event.capacity === 0 ? 'Unlimited' : event.capacity}</td><td><span className="badge">{event.is_active ? 'Public' : 'Hidden'}</span></td><td><Link href={`/admin/events/${event.id}`} aria-label={`Edit ${event.name}`}>Edit</Link></td></tr>)}</tbody></table></div>}{events && <Pagination page={page} count={events.length} change={setPage} />}</>;
}
