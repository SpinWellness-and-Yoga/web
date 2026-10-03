'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, RequestError } from './api';
import SwaySun from '../../_components/SwaySun';
const links = [['/admin', 'Overview'], ['/admin/posts', 'Blog posts'], ['/admin/events', 'Events'], ['/admin/content', 'Website content'], ['/admin/media', 'Media'], ['/admin/drive', 'Drive']];
export default function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const login = pathname === '/admin/login';
  const [verifiedPath, setVerifiedPath] = useState(''); const ready = verifiedPath === pathname; const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0);
  useEffect(() => { if (login) return; const controller = new AbortController();
    api<{ email: string }>('/api/admin/session', { signal: controller.signal }).then(session => { if (!session || typeof session.email !== 'string' || !session.email) throw new Error('Your session could not be verified. Please sign in again.'); setVerifiedPath(pathname); setError(''); }).catch(issue => { if (issue.name === 'AbortError') return; if (issue instanceof RequestError && issue.status === 401) router.replace('/admin/login'); else setError(issue.message); });
    return () => controller.abort();
  }, [login, pathname, router, attempt]);
  async function signOut() { if (!window.dispatchEvent(new Event('studio:navigate', { cancelable: true }))) return; try { await api('/api/auth/sign-out', { method: 'POST' }); setVerifiedPath(''); router.replace('/admin/login'); } catch (issue) { setError((issue as Error).message); } }
  if (login) return <div className="studio studio-login-shell">{children}</div>;
  if (!ready) return <div className="studio studio-login-shell"><div className="loading">{error ? <><p role="alert">{error}</p><button className="button" onClick={() => { setError(''); setAttempt(value => value + 1); }}>Try again</button></> : <><SwaySun className="studio-sun" /><p role="status">Checking your access…</p></>}</div></div>;
  return <div className="studio"><a className="skip" href="#studio-main">Skip to content</a><aside className="studio-sidebar"><div className="studio-brand"><Image unoptimized src="/brand/sway-wordmark.png" alt="Sway" width="138" height="58" /><small>Content studio</small></div><nav className="studio-nav" aria-label="Administration">{links.map(([href, label]) => <Link key={href} href={href} aria-current={(href === '/admin' ? pathname === href : pathname.startsWith(href)) ? 'page' : undefined}>{label}</Link>)}</nav><div className="studio-end"><button onClick={signOut}>Sign out</button></div></aside><main id="studio-main" className="studio-main"><header className="studio-top"><span>Spinwellness &amp; Yoga / Content studio</span><span>Website administration</span></header>{error && <p className="notice error" role="alert">{error}</p>}{children}</main></div>;
}
