export type PostStatus = 'draft' | 'published' | 'archived';
export interface Post {
  id: string; slug: string; title: string; excerpt: string; body: string;
  category: string; author: string; cover_url: string; cover_alt: string;
  status: PostStatus; featured: boolean; version: number;
  published_at: string | null; created_at: string; updated_at: string;
}
export type PostInput = Omit<Post, 'id' | 'version' | 'published_at' | 'created_at' | 'updated_at'>;
export interface CmsEvent {
  id: string; name: string; description: string; image_url: string | null;
  start_date: string; end_date: string; location: string; venue: string | null;
  capacity: number; price: number; is_active: boolean; locations: string | null;
  version: number; created_at: string; updated_at: string; registration_count: number;
}
export type EventInput = Omit<CmsEvent, 'version' | 'created_at' | 'updated_at' | 'registration_count'>;
export interface ContentValues {
  homepage: { heading: string; introduction: string; hero_image: string; hero_alt: string };
  services: { items: { title: string; copy: string; image: string | null; image_alt: string }[] };
  team: { items: { name: string; role: string; bio: string; image: string | null }[] };
  faq: { items: { question: string; answer: string }[] };
  contact: { heading: string; introduction: string; email: string; location: string; social_links: { label: string; url: string }[] };
}
export type ContentKey = keyof ContentValues;
export type ContentRecord<K extends ContentKey = ContentKey> = { key: K; value: ContentValues[K]; version: number; updated_at: string | null };
export interface MediaAsset { id: string; url: string; alt: string; name: string; created_at: string }
export interface Overview { published_posts: number; draft_posts: number; active_events: number; registrations: number; recent_posts: Post[] }
