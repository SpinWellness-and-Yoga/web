'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

// play the entrance with the animation interface, so the server markup stays unchanged.
function watchReveals(root: HTMLElement) {
  const show = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      show.unobserve(entry.target);
      entry.target.animate(
        [{ opacity: 0, transform: 'translateY(48px) scale(0.96)' }, { opacity: 1, transform: 'none' }],
        { duration: 800, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
    }
  });
  const seen = new WeakSet<Element>();
  const scan = () => {
    for (const element of root.querySelectorAll('.reveal')) {
      if (seen.has(element)) continue;
      seen.add(element);
      if (element.getBoundingClientRect().top > window.innerHeight) show.observe(element);
    }
  };
  scan();
  const added = new MutationObserver(scan);
  added.observe(root, { childList: true, subtree: true });
  return () => { show.disconnect(); added.disconnect(); };
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;
    
    const wrapper = wrapperRef.current;
    wrapper.style.opacity = '0';
    wrapper.style.transform = 'translateY(10px)';
    
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wrapper.style.opacity = '1';
        wrapper.style.transform = 'translateY(0)';
      });
    });
    const stopReveals = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? () => {} : watchReveals(wrapper);

    return () => { cancelAnimationFrame(timer); stopReveals(); };
  }, [pathname]);

  return (
    <div 
      ref={wrapperRef}
      className="page-transition-wrapper"
    >
      {children}
    </div>
  );
}
