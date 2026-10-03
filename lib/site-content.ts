import { getPublicContent } from './cms/public';
import type { ContentKey, ContentValues } from './cms/types';
import { defaultContact, defaultFaq, defaultHomepage, defaultServices, defaultTeam } from './site-defaults';

export const siteDefaults: ContentValues = {
  homepage: { ...defaultHomepage, hero_image: '', hero_alt: '' },
  services: { items: defaultServices.map(item => ({ ...item, image: null, image_alt: "" })) }, team: { items: defaultTeam },
  faq: { items: defaultFaq }, contact: defaultContact,
};

export async function readSiteContent<K extends ContentKey>(key: K): Promise<ContentValues[K]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return siteDefaults[key];
  return (await getPublicContent(key)) ?? siteDefaults[key];
}
