import type { Metadata } from "next";
import Image from "next/image";
import WaitlistCard from "./_components/WaitlistCard";
import styles from "./page.module.css";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Spinwellness & Yoga | Transform Employee Wellness",
  description:
    "A holistic wellness platform for modern workplaces. Employee wellness, productivity, wellbeing, and company wellness culture reimagined.",
};

const services = [
  {
    title: "1:1 therapy & weekly wellness",
    copy: "Certified therapists and instructors supporting every employee with calm, consistent care.",
  },
  {
    title: "Evergreen wellness library",
    copy: "Accessible wellness and productivity library with yoga, fitness, nutrition, breathwork, books, and guided support on demand.",
  },
  {
    title: "Wellness meets productivity",
    copy: "Guided rituals, deep-work sprints, and wellbeing nudges that keep teams clear-headed and sustainably productive.",
  },
  {
    title: "Culture design & onboarding",
    copy: "Intentional onboarding experiences and manager toolkits that embed wellbeing from day one.",
  },
  {
    title: "Curated wellness kits",
    copy: "Co-branded welcome packs, stress tools, and physical touchpoints tailored to every company.",
  },
];

const promises = [
  "Employee wellbeing programs with 1:1 therapy and wellness sessions",
  "Productivity optimization through guided rituals and deep-work sprints",
  "Trauma-informed, culturally aware practitioners for every team",
  "Measurable wellness insights and data for leadership reporting",
];

const stats = [
  { value: "92%", label: "of teams report calmer weeks" },
  { value: "3x", label: "productivity lift after 90 days" },
];

export default function Home() {
  return (
    <div className={styles.shell}>
      <header className={styles.navbar}>
        <div className={styles.navInner}>
          <a href="#top" className={styles.brand}>
            <Image
              src="/logos/SWAY-Alt-logo-PNG.png"
              alt="Spinwellness & Yoga primary logo"
              width={300}
              height={100}
              priority
            />
          </a>
          <nav className={styles.navLinks} aria-label="Primary">
            <a href="#services">Services</a>
            <a href="#why">Why Us</a>
            <a href="#waitlist">Waitlist</a>
          </nav>

        </div>
      </header>

      <main id="top" className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>Transform Employee Wellness</span>
              <h1 className={styles.heroTitle}>...the OM of bliss</h1>
              <p className={styles.heroBody}>
                A holistic wellness platform for modern workplaces.
              </p>
              <div className={styles.heroHighlights}>
                <div className={styles.highlightItem}>
                  <span className={styles.highlightIcon}>🧘</span>
                  <span className={styles.highlightText}><strong>Employee Wellness</strong> that feels personal, not corporate</span>
                </div>
                <div className={styles.highlightItem}>
                  <span className={styles.highlightIcon}>⚡</span>
                  <span className={styles.highlightText}><strong>Productivity</strong> powered by sustainable energy, not burnout</span>
                </div>
                <div className={styles.highlightItem}>
                  <span className={styles.highlightIcon}>💚</span>
                  <span className={styles.highlightText}><strong>Wellbeing</strong> embedded in every workday, every interaction</span>
                </div>
                <div className={styles.highlightItem}>
                  <span className={styles.highlightIcon}>🌱</span>
                  <span className={styles.highlightText}><strong>Wellness Culture</strong> that transforms how teams thrive together</span>
                </div>
              </div>
              <p className={styles.heroSubtext}>
                Be the first to experience workplace wellness reimagined—where therapy meets movement, 
                productivity meets peace, and culture becomes your competitive advantage.
              </p>
              <div className={styles.heroActions}>
                <a href="#waitlist" className={styles.primaryButton}>
                  Join Waitlist
                </a>
              </div>
            </div>
            <aside className={styles.heroCard}>
              <WaitlistCard />
            </aside>
          </div>
        </section>

        <section className={styles.servicesSection} id="services">
          <header className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>our services</span>
            <h2>Wellness services designed for your team</h2>
            <p>
              Thoughtfully crafted offerings that merge evidence-based care, mindful movement, and cultural resonance for modern teams.
            </p>
          </header>
          <div className={styles.serviceGrid}>
            {services.map((service) => (
              <article key={service.title} className={styles.serviceCard}>
                <h3>{service.title}</h3>
                <p>{service.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.whySection} id="why">
          <div className={styles.whyContent}>
            <header>
              <span className={styles.sectionKicker}>why spinwellness & yoga</span>
              <h2>Wellness that feels bespoke, measurable, and deeply human.</h2>
              <p>
                We combine trauma-informed facilitators, evergreen resources, and culture-first onboarding so your people
                feel grounded and energised every week.
              </p>
            </header>
            <ul className={styles.benefitList}>
              <li>
                <strong>Stress melts away</strong>
                <span>Employees experience calmer nervous systems and sustainable energy.</span>
              </li>
              <li>
                <strong>Productivity with compassion</strong>
                <span>Our rituals align wellbeing with focus, helping teams deliver without burnout.</span>
              </li>
              <li>
                <strong>Culture you can feel</strong>
                <span>From onboarding kits to manager playbooks, wellbeing becomes a lived value.</span>
              </li>
              <li>
                <strong>Made for every team size</strong>
                <span>Flexible plans that scale from startups to enterprise hubs.</span>
              </li>
            </ul>
          </div>
          <div className={styles.statColumn}>
            {stats.map((stat) => (
              <div key={stat.label} className={styles.statCard}>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.ctaSection} id="waitlist">
          <h2>Transform how your teams experience workplace wellness.</h2>
          <p>
            Be among the first to access holistic employee wellbeing programs designed for modern workplaces.
          </p>
          <a className={styles.ctaButton} href="#top">
            Get Early Access
          </a>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Image
              src="/logos/SWAY-Alt-logo-PNG.png"
              alt="Spinwellness logomark"
              width={180}
              height={250}
            />
            <p>Spinwellness & Yoga — wellness, therapy, and culture design for modern teams.</p>
          </div>
          <div className={styles.footerMeta}>
            <span>© {new Date().getFullYear()} Spinwellness & Yoga. All rights reserved.</span>
            <span>Launching globally · Rooted in Lagos & evergreen calm.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
