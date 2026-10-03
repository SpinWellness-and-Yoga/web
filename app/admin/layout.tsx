import type { Metadata } from 'next';
import StudioShell from './_components/studio-shell';
import './admin.css';
export const metadata: Metadata = { title: 'Content studio | Sway', robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) { return <StudioShell>{children}</StudioShell>; }
