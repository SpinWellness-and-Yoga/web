export class RequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...options, cache: 'no-store', headers });
  const result: unknown = await response.json().catch(() => null);
  const envelope = result && typeof result === 'object' ? result as Record<string, unknown> : null;
  if (!response.ok) {
    const error = typeof envelope?.error === 'string' ? envelope.error : 'The request failed. Please try again.';
    throw new RequestError(error, response.status);
  }
  if (!envelope || !('data' in envelope)) throw new RequestError('The server returned an incomplete response. Please try again.', 502);
  return envelope.data as T;
}
