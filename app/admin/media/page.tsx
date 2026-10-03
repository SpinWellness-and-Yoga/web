import Link from 'next/link';
import MediaLibrary from '../_components/media-library';
export default function Media() { return <><div className="studio-heading"><div><h1>Media library</h1><p className="muted">Images for your stories and events.</p></div><Link className="button" href="/admin/drive">Add to drive</Link></div><MediaLibrary /></>; }
