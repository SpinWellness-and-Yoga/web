import styles from './SwaySun.module.css';
export default function SwaySun({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`${styles.sun} ${className}`}><span className={styles.rays} /><span className={styles.core} /></span>;
}
