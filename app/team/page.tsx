'use client';

import Image from 'next/image';
import Navbar from '../_components/Navbar';
import styles from './page.module.css';

const teamMembers = [
  {
    name: 'Ibrahim Baraqhat',
    role: 'CEO and Lead Wellness Instructor',
    image: '/team-ibrahim-baraqhat.jpg',
    bio: 'Eyimofe leads SpinWellness & Yoga with a vision to transform wellness for both individuals and workplace teams through trauma-informed practices and compassionate care. As our CEO and Lead Wellness Instructor, she combines deep expertise in wellness facilitation with strategic leadership, ensuring our programs deliver meaningful impact for individuals and organizations alike.',
  },
  {
    name: 'Babalola Oluwatoyin',
    role: 'Social Media Manager',
    image: '/team-babalola-oluwatoyin.png',
    bio: 'Oluwatoyin brings creativity and strategic vision to our social media presence, crafting content that resonates with our community and amplifies our wellness mission. With a keen eye for design and storytelling, she ensures our message reaches and inspires those seeking holistic workplace wellness solutions. Responsible for maintaining the organisation\'s online presence and coordinating content across its digital platforms.',
  },
  {
    name: 'Ibukunoluwa Junaid',
    role: 'Assistant',
    image: '/team-ibukunoluwa-junaid-khadijat.jpg',
    bio: 'Ibukun provides essential organizational support and ensures smooth operations across all aspects of SpinWellness & Yoga. Her attention to detail and proactive approach helps our team stay focused on delivering exceptional wellness experiences to our clients. My role is to ensure the smooth operation of all Spin Wellness and Yoga activities. When I\'m not organizing or conducting research, you can find me lost in fiction.',
  },
  {
    name: 'Babalola Opeyemi',
    role: 'Engineering Lead',
    image: null,
    bio: 'Opeyemi leads our engineering efforts with expertise in building scalable, robust systems. Highly introverted, he enjoys designing and building complex software systems, listening to music, and watching anime. His technical leadership ensures our platform delivers seamless experiences for teams seeking wellness solutions.',
  },
];

export default function TeamPage() {
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
