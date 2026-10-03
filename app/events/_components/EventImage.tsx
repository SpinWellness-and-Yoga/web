import Image from 'next/image';
import styles from './EventImage.module.css';
export default function EventImage({ url, name, hero = false }: { url?: string | null; name: string; hero?: boolean }) {
  if (!url) return null;
  return <div className={hero ? styles.hero : styles.card}><Image src={url} alt={name} fill sizes={hero ? '(max-width: 768px) 100vw, 1200px' : '(max-width: 768px) 100vw, 600px'} unoptimized priority={hero} className={styles.image} /></div>;
}
