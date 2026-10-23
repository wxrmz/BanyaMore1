'use client';

import { useEffect, useState } from 'react';
import { magneticRef } from '@/lib/magnetic';

const SHOW_AFTER_PX = 600;

/** Круглая кнопка «наверх» в правом нижнем углу: появляется после прокрутки. */
export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const update = () => setIsVisible(window.scrollY > SHOW_AFTER_PX);

    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      ref={magneticRef}
      onClick={scrollToTop}
      aria-label="Наверх"
      title="Наверх"
      tabIndex={isVisible ? 0 : -1}
      className={`scroll-top-button fixed bottom-3 right-4 z-[60] grid h-[58px] w-[58px] place-items-center rounded-full border border-[#d6a15f]/45 bg-[#21170f]/85 text-[#d6a15f] shadow-[0_18px_45px_rgba(0,0,0,0.42)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[#d6a15f] hover:bg-[#d6a15f] hover:text-[#16110c] focus:outline-none focus:ring-2 focus:ring-[#d6a15f]/70 focus:ring-offset-2 focus:ring-offset-[#090806] sm:bottom-8 sm:right-8 sm:h-[74px] sm:w-[74px] ${
        isVisible ? 'pointer-events-auto opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-10 w-10 sm:h-12 sm:w-12">
        <path d="M12 19V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="m6 11.5 6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
