'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../_components/api';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : '';
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    if (!accessToken) return;
    window.history.replaceState(null, '', window.location.pathname);
    setBusy(true);
    setError('');
    api('/api/auth/verify', { method: 'POST', body: JSON.stringify({ accessToken }) })
      .then(() => { router.replace('/admin'); })
      .catch((issue) => { setError((issue as Error).message); setBusy(false); });
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (sent) {
        let payload: Record<string, string>;
        const match = token.match(/access_token=([^& \n\r]+)/);
        if (match) {
          payload = { accessToken: match[1] };
        } else if (token.startsWith('eyJ')) {
          payload = { accessToken: token.trim() };
        } else {
          payload = { email, token: token.trim() };
        }
        await api('/api/auth/verify', { method: 'POST', body: JSON.stringify(payload) });
        router.replace('/admin');
      } else {
        await api('/api/auth/sign-in', { method: 'POST', body: JSON.stringify({ email }) });
        setSent(true);
      }
    } catch (issue) {
      setError((issue as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login panel">
      <Image unoptimized src="/brand/sway-wordmark.png" alt="Sway" width={150} height={65} />
      <p className="eyebrow">Content studio</p>
      <h1>Welcome back.</h1>
      <p className="muted">Sign in to manage your stories, events, and website.</p>
      <form onSubmit={submit}>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={sent || busy}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {sent && (
          <>
            <p className="notice">
              Check your inbox. Click the link in your email, or enter your sign-in code below.
            </p>
            <label>
              Sign-in code or link
              <input
                autoComplete="one-time-code"
                required
                value={token}
                placeholder="6-digit code or paste sign-in link"
                onChange={(event) => setToken(event.target.value)}
              />
            </label>
          </>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy} className="button primary">
          {busy ? 'Please wait…' : sent ? 'Sign in' : 'Send sign-in link'}
        </button>
        {sent && (
          <button
            type="button"
            className="link-button"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setToken('');
            }}
          >
            Use another email or request a new link
          </button>
        )}
      </form>
    </main>
  );
}
