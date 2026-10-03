'use client';

import Link from 'next/link';
import Navbar from '../_components/Navbar';
import styles from './page.module.css';

const benefits = [
  {
    stat: '87.5%',
    title: 'Adherence Rate',
    description: 'Chair yoga shows exceptional adherence with ZERO adverse events in care settings',
    source: 'Int. Journal of Behavioral Nutrition and Physical Activity',
  },
  {
    stat: '30%',
    title: 'Fall Risk Reduction',
    description: 'Improved balance and mobility reduces fall risk significantly',
    source: 'Age & Ageing Meta-Analysis (Youkhana et al., 2016)',
  },
  {
    stat: 'p<0.001',
    title: 'Depression Reduction',
    description: 'Significant reduction in depression and problem behaviors in dementia residents',
    source: 'International Psychogeriatrics (Chen et al., 2008)',
  },
];

const services = [
  {
    title: 'Chair Yoga Sessions',
    description: 'Gentle, accessible movement for all mobility levels. We bring mats, chairs, and equipment — no special facilities required.',
    features: ['Breathwork & relaxation', 'Gentle stretching', 'Seated & standing options', 'Wheelchair accessible'],
  },
  {
    title: 'Dementia-Friendly Classes',
    description: 'Specialised sessions designed for residents with memory challenges, promoting present-moment awareness and calm.',
    features: ['Familiar music integration', 'Repetitive, soothing movements', 'Sensory engagement', 'Caregiver participation welcome'],
  },
  {
    title: 'Staff Wellness Support',
    description: 'Self-care sessions for care home staff — because those who care for others need care too.',
    features: ['Stress relief techniques', 'Quick 15-minute resets', 'Team building through movement', 'Preventing burnout'],
  },
  {
    title: 'Family & Community Events',
    description: 'Intergenerational sessions that bring families, residents, and staff together through movement.',
    features: ['Visit day activities', 'Special occasion events', 'Community building', 'Memorable experiences'],
  },
];

const researchHighlights = [
  {
    title: 'Memory & Cognitive Function',
    finding: 'Yoga participants showed significant improvement in immediate and delayed recall, attention, working memory, and executive function.',
    source: 'Yoga International / PMC Systematic Review',
  },
  {
    title: 'Physical Health',
    finding: 'Lowered blood pressure, reduced respiration rate, strengthened cardiopulmonary fitness, enhanced flexibility, and improved balance.',
    source: 'International Psychogeriatrics Study',
  },
  {
    title: 'Mental Wellbeing',
    finding: 'Significant reduction in depression state and problem behaviors (p < 0.001) with 12-week yoga programmes.',
    source: 'Taiwan Long-Term Care Study (68 residents)',
  },
  {
    title: 'Feasibility',
    finding: '87.5% adherence rate with zero injuries — proving yoga is safe and sustainable for care home residents.',
    source: 'Florida Atlantic University Study',
  },
];

export default function CareHomesPage() {
  return (
    <div className={styles.shell}>
      <Navbar />

      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.kicker}>Research-Backed Wellness for Care Homes</span>
            <h1 className={styles.heroTitle}>
              Bringing the Benefits of Yoga to Your Residents
            </h1>
            <p className={styles.heroBody}>
              Evidence-based yoga and wellness programmes designed specifically for care homes, 
              nursing facilities, and residential communities across the UK.
            </p>
            <div className={styles.heroActions}>
              <Link href="#services" className={styles.primaryButton}>
                Explore Our Programmes
              </Link>
              <Link href="#research" className={styles.secondaryButton}>
                View the Research
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className={styles.statsSection}>
          <div className={styles.statsGrid}>
            {benefits.map((benefit) => (
              <div key={benefit.title} className={styles.statCard}>
                <span className={styles.statNumber}>{benefit.stat}</span>
                <h3 className={styles.statTitle}>{benefit.title}</h3>
                <p className={styles.statDescription}>{benefit.description}</p>
                <span className={styles.statSource}>{benefit.source}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Services Section */}
        <section className={styles.servicesSection} id="services">
          <header className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Our Services</span>
            <h2>Programmes Designed for Care Environments</h2>
            <p>
              Flexible, accessible wellness sessions that integrate seamlessly with your existing activities programme.
            </p>
          </header>
          <div className={styles.servicesGrid}>
            {services.map((service) => (
              <article key={service.title} className={styles.serviceCard}>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <ul className="sway-bullets">
                  {service.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* Research Section */}
        <section className={styles.researchSection} id="research">
          <header className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>The Evidence</span>
            <h2>Research-Backed Benefits of Yoga for Elderly Care</h2>
            <p>
              Peer-reviewed studies demonstrating the measurable impact of yoga on physical health, 
              cognitive function, and emotional wellbeing in care home settings.
            </p>
          </header>
          <div className={styles.researchGrid}>
            {researchHighlights.map((item) => (
              <div key={item.title} className={styles.researchCard}>
                <h3>{item.title}</h3>
                <p>{item.finding}</p>
                <span className={styles.researchSource}>{item.source}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Why Us Section */}
        <section className={styles.whySection}>
          <div className={styles.whyContent}>
            <header>
              <span className={styles.sectionKicker}>Why SpinWellness & Yoga</span>
              <h2>Trusted by Care Homes Across the UK</h2>
            </header>
            <ul className={styles.benefitList}>
              <li>
                <strong>Fully Insured & Certified</strong>
                <span>Professional instructors with specialist training in elderly and dementia care.</span>
              </li>
              <li>
                <strong>No Equipment Needed</strong>
                <span>We bring everything — mats, chairs, props. Just provide the space.</span>
              </li>
              <li>
                <strong>Flexible Scheduling</strong>
                <span>One-off sessions, weekly programmes, or special events — we adapt to your timetable.</span>
              </li>
              <li>
                <strong>CQC-Aligned</strong>
                <span>Activities that support CQC ratings by demonstrating commitment to resident wellbeing.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.ctaSection} id="contact">
          <div className={styles.ctaContent}>
            <h2>Discuss Your Requirements</h2>
            <p>
              Every care home is unique. We work with you to design a yoga programme that fits your 
              residents&apos; needs, your schedule, and your care philosophy.
            </p>
            <Link href="/contact?subject=Care%20Home%20Enquiry" className={styles.ctaButton}>
              Get in Touch
            </Link>
            <p className={styles.ctaNote}>
              Or email us directly at{' '}
              <a href="mailto:admin@spinwellnessandyoga.com">admin@spinwellnessandyoga.com</a>
            </p>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className={styles.testimonialsSection}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>What Research Says</span>
            <h2>Quotes from the Studies</h2>
          </header>
          <div className={styles.testimonialsGrid}>
            <blockquote className={styles.testimonial}>
              <p>
                &ldquo;Yoga exercise has positive benefits for both the physical and mental health of elders with dementia. 
                It is recommended that yoga be included as one of the routine activities in long-term care facilities.&rdquo;
              </p>
              <cite>— International Psychogeriatrics, Cambridge University Press</cite>
            </blockquote>
            <blockquote className={styles.testimonial}>
              <p>
                &ldquo;The yoga-trained participants had better physical and mental health... including lowered blood pressure, 
                reduced depression, and improved balance.&rdquo;
              </p>
              <cite>— Chen et al., Taiwan Dementia Care Study</cite>
            </blockquote>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <p>Spinwellness & Yoga — wellness, therapy, and culture design for care homes.</p>
          </div>
          <div className={styles.footerMeta}>
            <span>© {new Date().getFullYear()} Spinwellness & Yoga. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
