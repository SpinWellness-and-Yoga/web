import { z } from 'zod';
const text = (max: number) => z.string().trim().min(1).max(max);
export const imageUrl = z.string().max(2048).refine(value => !value || /^\/(?!\/)[^\\]*$/.test(value) || /^https:\/\/[^\s]+$/.test(value));
export const identifier = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const postSchema = z.object({
  slug: z.string().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title: text(180), excerpt: text(400),
  body: text(100000), category: text(80), author: text(120), cover_url: imageUrl, cover_alt: z.string().trim().max(240),
  status: z.enum(['draft', 'published', 'archived']), featured: z.boolean(),
}).strict().refine(post => !post.cover_url || post.cover_alt.length > 0);
export const eventSchema = z.object({
  name: text(180), description: text(10000), image_url: imageUrl.nullable(),
  start_date: z.string().datetime({ offset: true }), end_date: z.string().datetime({ offset: true }),
  location: text(300), venue: z.string().max(300).nullable(), capacity: z.number().int().min(0).max(100000),
  price: z.number().min(0).max(100000), is_active: z.boolean(), locations: z.string().max(4000).nullable(),
}).strict().refine(event => Date.parse(event.end_date) > Date.parse(event.start_date));
export const contentSchemas = {
  homepage: z.object({ heading: text(180), introduction: text(2000), hero_image: imageUrl.default(''), hero_alt: z.string().max(240).default('') }).strict().refine(value => !value.hero_image || !!value.hero_alt),
  services: z.object({ items: z.array(z.object({ title: text(180), copy: text(4000), image: imageUrl.nullable().default(null), image_alt: z.string().max(240).default('') }).strict().refine(value => !value.image || !!value.image_alt)).min(1).max(20) }).strict(),
  team: z.object({ items: z.array(z.object({ name: text(120), role: text(180), bio: text(4000), image: imageUrl.nullable() }).strict()).max(30) }).strict(),
  faq: z.object({ items: z.array(z.object({ question: text(300), answer: text(4000) }).strict()).max(50) }).strict(),
  contact: z.object({ heading: text(180), introduction: text(2000), email: z.email().max(254), location: text(500), social_links: z.array(z.object({ label: text(80), url: z.url().refine(value => value.startsWith('https://')) }).strict()).max(10) }).strict(),
};
export const contentKeySchema = z.enum(['homepage', 'services', 'team', 'faq', 'contact']);
export const versionSchema = z.number().int().min(0);
export const emailSchema = z.object({ email: z.email().max(254).transform(value => value.toLowerCase()) }).strict();
const otpCodeSchema = z.string().regex(/^\d{6,8}$/);
export const verifyOtpSchema = emailSchema.extend({ token: otpCodeSchema });
export const verifyTokenSchema = z.object({ accessToken: z.string().min(20).max(4096) }).strict();
export const verifySchema = z.union([verifyOtpSchema, verifyTokenSchema]);
