import { readSiteContent } from '@/lib/site-content';
import ContactForm from './ContactForm';

export const dynamic = 'force-dynamic';
export default async function ContactPage() {
  return <ContactForm content={await readSiteContent('contact')} />;
}
