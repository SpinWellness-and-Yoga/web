export function readingMinutes(body: string): number {
  return Math.max(1, Math.ceil(body.trim().split(/\s+/u).filter(Boolean).length / 200));
}

export function blogDate(value: string | null): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}

export function blogQuery(values: Record<string, string | string[] | undefined>) {
  const query = typeof values.q === 'string' ? values.q.trim().slice(0, 100) : '';
  const category = typeof values.category === 'string' ? values.category.trim().slice(0, 80) : '';
  const value = typeof values.page === 'string' ? Number(values.page) : 1;
  const page = Number.isSafeInteger(value) && value > 0 ? Math.min(value, 10000) : 1;
  return { query, category, page };
}

export function blogHref(query: string, category: string, page = 1): string {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (category) params.set('category', category);
  if (page > 1) params.set('page', String(page));
  return `/blog${params.size ? `?${params}` : ''}`;
}
