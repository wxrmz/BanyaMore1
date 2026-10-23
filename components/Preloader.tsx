'use client';

import { useEffect, useState } from 'react';
import { markPreloaderDone } from '@/lib/preloader';
import BathHouseMark from './BathHouseMark';

// Заставка держится, пока грузится фотография первого экрана, но не меньше
// MIN_VISIBLE_MS от начала загрузки страницы (чтобы не мигала) и не дольше
// MAX_WAIT_MS (чтобы медленная сеть не держала посетителя).
const MIN_VISIBLE_MS = 1100;
const MAX_WAIT_MS = 4000;
// Совпадает с длительностью исчезновения .site-preloader.is-leaving в globals.css.
const LEAVE_MS = 700;

type Phase = 'loading' | 'leaving' | 'done';

export default function Preloader() {
  const [phase, setPhase] = useState<Phase>('loading');

  useEffect(() => {
    let leaveTimer: number | undefined;
    let doneTimer: number | undefined;

    const leave = () => {
      if (leaveTimer !== undefined) return;
      const wait = Math.max(0, MIN_VISIBLE_MS - performance.now());
      leaveTimer = window.setTimeout(() => {
        setPhase('leaving');
        markPreloaderDone();
        doneTimer = window.setTimeout(() => setPhase('done'), LEAVE_MS);
      }, wait);
    };

    if (document.readyState === 'complete') {
      leave();
    } else {
      window.addEventListener('load', leave, { once: true });
    }
    const fallback = window.setTimeout(leave, Math.max(0, MAX_WAIT_MS - performance.now()));

    return () => {
      window.removeEventListener('load', leave);
      window.clearTimeout(fallback);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  if (phase === 'done') {
    return null;
  }

  return (
    <div
      className={`site-preloader ${phase === 'leaving' ? 'is-leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Загрузка сайта"
    >
      {/* Без JavaScript заставка не уйдёт сама, поэтому прячем её сразу. */}
      <noscript>
        <style>{'.site-preloader{display:none!important}'}</style>
      </noscript>

      <div className="site-preloader__inner">
        <BathHouseMark />

        <div className="site-preloader__brand">
          <span className="site-preloader__name font-serif">Баня Море</span>
          <span className="site-preloader__city">Владивосток</span>
        </div>

        <span className="site-preloader__bar" aria-hidden="true">
          <span />
        </span>
      </div>
    </div>
  );
}
