'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

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

    return () => cancelAnimationFrame(timer);
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

