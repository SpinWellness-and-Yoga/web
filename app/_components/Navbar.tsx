'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const hideTimerRef = useRef<number | null>(null);
  const lastPathRef = useRef<string>(pathname);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleAutoHide = useCallback(() => {
    clearHideTimer();
    if (typeof window === 'undefined') return;
    if (mobileMenuOpen) return;
    if (window.scrollY <= 20) return;

    hideTimerRef.current = window.setTimeout(() => {
      setIsScrollingDown(true);
    }, 150);
  }, [clearHideTimer, mobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // keep navbar visible near the top
      if (currentScrollY <= 20) {
        setIsScrollingDown(false);
        clearHideTimer();
        setLastScrollY(currentScrollY);
        return;
      }

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsScrollingDown(true);
        clearHideTimer();
      } else {
        setIsScrollingDown(false);
        scheduleAutoHide();
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, clearHideTimer, scheduleAutoHide]);

  // auto-hide after a short idle period when shown from scroll-up
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (mobileMenuOpen) return;
    if (isScrollingDown) return;
    if (window.scrollY <= 20) return;

    const onActivity = () => {
      if (mobileMenuOpen) return;
      if (window.scrollY <= 20) return;
      scheduleAutoHide();
    };

    window.addEventListener('pointerdown', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity);
    window.addEventListener('touchstart', onActivity, { passive: true });
    window.addEventListener('mousemove', onActivity, { passive: true });

    // schedule once when becoming visible
    scheduleAutoHide();

    return () => {
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('mousemove', onActivity);
      clearHideTimer();
    };
  }, [isScrollingDown, mobileMenuOpen, scheduleAutoHide, clearHideTimer]);

  // close the mobile menu on route change (but do not immediately close on open)
  useEffect(() => {
    const prev = lastPathRef.current;
    lastPathRef.current = pathname;
    if (!mobileMenuOpen) return;
    if (prev === pathname) return;
    const t = window.setTimeout(() => setMobileMenuOpen(false), 0);
    return () => window.clearTimeout(t);
  }, [pathname, mobileMenuOpen]);

  const handleToggleMenu = () => {
    clearHideTimer();
    setIsScrollingDown(false);
    setMobileMenuOpen((v) => !v);
  };

  return (
    <header
      className={`${styles.navbar} ${(isScrollingDown && !mobileMenuOpen) ? styles.hidden : ''} ${className ?? ''}`}
    >
      <div className={styles.navInner}>
        <Link href="/" className={styles.brand} aria-label="home">
          <Image
            src="/logos/SWAY-logomark-PNG.png"
            alt="Spinwellness & Yoga"
              width={760}
              height={760}
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
          onClick={handleToggleMenu}
          aria-label="toggle menu"
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div
        className={styles.mobileMenu}
        style={{
          transform: mobileMenuOpen ? 'translateY(0)' : undefined,
          opacity: mobileMenuOpen ? 1 : undefined,
          pointerEvents: mobileMenuOpen ? 'auto' : undefined,
        }}
        aria-hidden={!mobileMenuOpen}
      >
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


