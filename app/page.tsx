
import Image from "next/image";
import { readSiteContent } from "@/lib/site-content";
import LatestPosts from "./blog/_components/LatestPosts";
import Link from "next/link";
import Navbar from "./_components/Navbar";
import WaitlistCard from "./_components/WaitlistCard";
import SwaySun from "./_components/SwaySun";
import { BuildingIcon, LightningIcon, HeartIcon, PlantIcon } from "./_components/Icons";
import styles from "./page.module.css";


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

export const dynamic = "force-dynamic";

export default async function Home() {
  const [homepage, serviceContent] = await Promise.all([readSiteContent("homepage"), readSiteContent("services")]);
  const services = serviceContent.items;
  return (
    <div className={styles.shell}>
      <Navbar />

      <main id="top" className={styles.main}>
        <section className={styles.hero}>
          <SwaySun className={styles.heroSun} />
          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>Transforming Employee Wellness</span>
              <div className={styles.whatWeDoSection}>
                <h2 className={styles.whatWeDoTitle}>{homepage.heading}</h2>
                <p className={styles.whatWeDoIntro}>
                  {homepage.introduction}
                </p>
                <div className={styles.heroHighlights}>
                  <div className={styles.highlightItem}>
                    <div className={styles.highlightIcon}>
                      <BuildingIcon />
                    </div>
                    <span className={styles.highlightText}><strong>Corporate Wellness Programs</strong> designed for modern teams and employees</span>
                  </div>
                  <div className={styles.highlightItem}>
                    <div className={styles.highlightIcon}>
                      <LightningIcon />
                    </div>
                    <span className={styles.highlightText}><strong>Productivity</strong> powered by sustainable energy, not burnout</span>
                  </div>
                  <div className={styles.highlightItem}>
                    <div className={styles.highlightIcon}>
                      <HeartIcon />
                    </div>
                    <span className={styles.highlightText}><strong>Employee Wellbeing</strong> embedded in every workday, every interaction</span>
                  </div>
                  <div className={styles.highlightItem}>
                    <div className={styles.highlightIcon}>
                      <PlantIcon />
                    </div>
                    <span className={styles.highlightText}><strong>Organisational Wellness Culture</strong> that we curate and develop your company wellness culture</span>
                  </div>
                </div>
              </div>
              <div className={styles.heroActions}>
                <Link href="/contact" className={styles.primaryButton}>
                  Contact Us
                </Link>
              </div>
            </div>
            <aside className={styles.heroCard}>
              {homepage.hero_image && <Image src={homepage.hero_image} alt={homepage.hero_alt} width={640} height={420} unoptimized className={styles.managedHero} />}
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
              <article key={service.title} className={`${styles.serviceCard} reveal`}>
                {service.image && <Image src={service.image} alt={service.image_alt || ""} width={640} height={400} unoptimized className={styles.serviceImage} />}
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
              <li className="reveal">
                <strong>Stress melts away</strong>
                <span>Employees experience calmer nervous systems and sustainable energy.</span>
              </li>
              <li className="reveal">
                <strong>Productivity with compassion</strong>
                <span>Our rituals align wellbeing with focus, helping teams deliver without burnout.</span>
              </li>
              <li className="reveal">
                <strong>Culture you can feel</strong>
                <span>From onboarding kits to manager playbooks, wellbeing becomes a lived value.</span>
              </li>
              <li className="reveal">
                <strong>Made for every team size</strong>
                <span>Flexible plans that scale from startups to enterprise hubs.</span>
              </li>
            </ul>
          </div>
          <div className={styles.statColumn}>
            {stats.map((stat) => (
              <div key={stat.label} className={`${styles.statCard} reveal`}>
                <SwaySun className={styles.statSun} />
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <LatestPosts />

        <section className={`${styles.ctaSection} sway-pattern reveal`} id="waitlist">
          <SwaySun className={styles.ctaSun} />
          <h2>Transform how your teams experience workplace wellness.</h2>
          <p>
            Be among the first to access holistic employee wellbeing programs designed for modern workplaces.
          </p>
          <a className={styles.ctaButton} href="#top">
            Get Early Access
          </a>
        </section>
      </main>

      <footer className={`${styles.footer} sway-pattern`}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <SwaySun className={styles.footerSun} />
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
