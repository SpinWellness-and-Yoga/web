'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../page.module.css';

type NavbarProps = {
  className?: string;
};

export default function Navbar({ className }: NavbarProps) {
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsScrollingDown(true);
      } else {
        setIsScrollingDown(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <header className={`${styles.navbar} ${isScrollingDown ? styles.hidden : ''} ${className ?? ''}`}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.brand} aria-label="home">
          <Image
            src="/logos/SWAY-Primary-logo-(iteration).png"
            alt="Spinwellness & Yoga"
            width={1260}
            height={360}
            priority
            quality={95}
            style={{ background: 'transparent' }}
          />
        </Link>

        <nav className={styles.navLinks} aria-label="Primary">
          <Link href="/#services">Services</Link>
          <Link href="/#why">Why Us</Link>
          <Link href="/events">Events</Link>
          <Link href="/#waitlist">Waitlist</Link>
          <Link href="/contact">Contact</Link>
        </nav>

        <button
          className={styles.hamburger}
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="toggle menu"
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.open : ''}`}>
        <Link href="/#services" onClick={() => setMobileMenuOpen(false)}>
          Services
        </Link>
        <Link href="/#why" onClick={() => setMobileMenuOpen(false)}>
          Why Us
        </Link>
        <Link href="/events" onClick={() => setMobileMenuOpen(false)}>
          Events
        </Link>
        <Link href="/#waitlist" onClick={() => setMobileMenuOpen(false)}>
          Waitlist
        </Link>
        <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>
          Contact
        </Link>
      </div>
    </header>
  );
}


