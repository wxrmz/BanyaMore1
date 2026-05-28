'use client';

import { useEffect } from 'react';

export default function ScrollToTopOnLoad() {
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const resetScroll = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    resetScroll();
    requestAnimationFrame(resetScroll);
    const timeout = window.setTimeout(resetScroll, 80);

    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}
