'use client';
import { useEffect, useState } from 'react';
import { api } from './request';
export { api, RequestError } from './request';
export function useResource<T>(path: string) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ path: string; revision: number; data: T | null; error: string } | null>(null);
  useEffect(() => { const controller = new AbortController();
    api<T>(path, { signal: controller.signal }).then(data => setResult({ path, revision, data, error: '' })).catch((issue: Error) => { if (issue.name !== 'AbortError') setResult({ path, revision, data: null, error: issue.message }); });
    return () => controller.abort();
  }, [path, revision]);
  const current = result?.path === path && result.revision === revision ? result : null;
  return { data: current?.data ?? null, error: current?.error ?? '', reload: () => setRevision(value => value + 1) };
}
export function useUnsaved(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const navigate = (event: Event) => { if (!window.confirm('Leave this page? Your unsaved changes will be lost.')) event.preventDefault(); };
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const click = (event: MouseEvent) => { const link = (event.target as Element).closest('a[href]'); if (link && !link.getAttribute('href')?.startsWith('#') && !window.confirm('Leave this page? Your unsaved changes will be lost.')) { event.preventDefault(); event.stopPropagation(); } };
    window.addEventListener('beforeunload', unload); window.addEventListener('studio:navigate', navigate); document.addEventListener('click', click, true);
    return () => { window.removeEventListener('beforeunload', unload); window.removeEventListener('studio:navigate', navigate); document.removeEventListener('click', click, true); };
  }, [dirty]);
}
export function date(value: string | null | undefined) { return value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'; }
