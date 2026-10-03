
import Image from 'next/image';
import { readSiteContent } from '@/lib/site-content';
import Navbar from '../_components/Navbar';
import styles from './page.module.css';


export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const { items: teamMembers } = await readSiteContent('team');
  return (
    <div className={styles.shell}>
      <Navbar />
      <main className={styles.main}>
        <section className={styles.teamSection}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>our team</span>
            <h1>Meet the SpinWellness & Yoga Team</h1>
            <p>
              dedicated professionals committed to transforming workplace wellness through thoughtful design, compassionate care, and innovative solutions.
            </p>
          </header>

          <div className={styles.teamGrid}>
            {teamMembers.map((member, index) => (
              <article key={member.name} className={styles.teamCard}>
                <div className={styles.cardContent}>
                  {member.image ? (
                    <div className={styles.imageWrapper}>
                      <Image
                        src={member.image}
                        unoptimized
                        alt={`${member.name}, ${member.role}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
                        className={styles.teamImage}
                        priority={index === 0}
                        quality={85}
                        loading={index === 0 ? 'eager' : 'lazy'}
                      />
                    </div>
                  ) : (
                    <div className={styles.placeholderImage}>
                      <span className={styles.placeholderInitials}>
                        {member.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className={styles.teamInfo}>
                    <h2 className={styles.teamName}>{member.name}</h2>
                    <p className={styles.teamRole}>{member.role}</p>
                  </div>
                  {member.bio && (
                    <div className={styles.bioOverlay}>
                      <p className={styles.teamBio}>{member.bio}</p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <p>Spinwellness & Yoga — wellness, therapy, and culture design for modern teams.</p>
          </div>
          <div className={styles.footerMeta}>
            <span>© 2025 Spinwellness & Yoga. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
