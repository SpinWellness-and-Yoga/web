'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../_components/api';
export default function Login() {
  const router = useRouter(); const [email, setEmail] = useState(''); const [token, setToken] = useState('');
  const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError('');
    try { await api(sent ? '/api/auth/verify' : '/api/auth/sign-in', { method: 'POST', body: JSON.stringify(sent ? { email, token } : { email }) }); if (sent) router.replace('/admin'); else setSent(true); }
    catch (issue) { setError((issue as Error).message); } finally { setBusy(false); }
  }
  return <main className="login panel"><Image unoptimized src="/brand/sway-wordmark.png" alt="Sway" width={150} height={65} /><p className="eyebrow">Content studio</p><h1>Welcome back.</h1><p className="muted">Sign in to manage your stories, events, and website.</p><form onSubmit={submit}><label>Email address<input type="email" autoComplete="email" required value={email} disabled={sent || busy} onChange={event => setEmail(event.target.value)} /></label>{sent && <><p className="notice">If your account has access, you will receive a sign-in code.</p><label>Sign-in code<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6,8}" required value={token} onChange={event => setToken(event.target.value)} /></label></>}{error && <p className="notice error" role="alert">{error}</p>}<button disabled={busy} className="button primary">{busy ? 'Please wait…' : sent ? 'Sign in' : 'Send sign-in code'}</button>{sent && <button type="button" className="link-button" disabled={busy} onClick={() => { setSent(false); setToken(''); }}>Use another email or request a new code</button>}</form></main>;
}
