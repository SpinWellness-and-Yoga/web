'use client';
import { useState } from 'react';
import type { ContentKey } from '../../../lib/cms/types';
import ContentEditor from '../_components/content-editor';
const tabs: [ContentKey, string][] = [['homepage', 'Homepage'], ['services', 'Services'], ['team', 'Team'], ['faq', 'FAQs'], ['contact', 'Contact']];
export default function Content() {
 const [section, setSection] = useState<ContentKey>('homepage'); const [dirty, setDirty] = useState(false);
 return <><div className="studio-heading"><div><span className="eyebrow">Your website, up to date</span><h1>Website content</h1><p className="muted">Edit your words, images, and contact details.</p></div></div><div className="content-tabs" aria-label="Website sections">{tabs.map(([key, label]) => <button className="button" key={key} aria-pressed={key === section} onClick={() => { if (key === section) return; if (!dirty || window.confirm('Discard unsaved changes and open another section?')) { setDirty(false); setSection(key); } }}>{label}</button>)}</div><ContentEditor key={section} section={section} onDirty={setDirty} /></>;
}
