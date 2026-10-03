import { cmsClient } from './client';
import { CmsError } from './http';
import { contentSchemas } from './validation';
import type { ContentKey, ContentValues, Post } from './types';
export async function getPublishedPosts(input: { query?: string; category?: string; page?: number } = {}) {
  const client = cmsClient();
  const page = Math.max(1, Math.min(10000, Math.floor(input.page || 1)));
  let query = client.from('website_posts').select('*', { count: 'exact' }).eq('status', 'published').lte('published_at', new Date().toISOString());
  if (input.category) query = query.eq('category', input.category.slice(0, 80));
  if (input.query) query = query.ilike('title', `%${input.query.slice(0, 100).replace(/[%_\\]/g, '')}%`);
  const [result, categories] = await Promise.all([
    query.order('featured', { ascending: false }).order('published_at', { ascending: false }).range((page - 1) * 12, page * 12 - 1),
    client.rpc('cms_public_categories'),
  ]);
  if (result.error || categories.error) throw new CmsError(503, 'Journal is unavailable.');
  return { posts: result.data as Post[], total: result.count || 0, categories: categories.data as string[] };
}
export async function getPublishedPost(slug: string): Promise<Post | null> {
  const { data, error } = await cmsClient().from('website_posts').select('*').eq('slug', slug).eq('status', 'published').lte('published_at', new Date().toISOString()).maybeSingle();
  if (error) throw new CmsError(503, 'Journal is unavailable.');
  return data as Post | null;
}
export async function getPublicContent<K extends ContentKey>(key: K): Promise<ContentValues[K] | null> {
  const { data, error } = await cmsClient().from('website_content').select('value').eq('key', key).maybeSingle();
  if (error) throw new CmsError(503, 'Website content is unavailable.');
  if (!data) return null;
  return contentSchemas[key].parse(data.value) as ContentValues[K];
}
