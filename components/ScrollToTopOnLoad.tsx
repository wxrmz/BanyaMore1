'use client';

import { useEffect } from 'react';

export default function ScrollToTopOnLoad() {
  useEffect(() => {
    document.documentElement.dataset.appHydrated = 'true';

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const resetScroll = () => window.scrollTo(0, 0);

    resetScroll();
    requestAnimationFrame(resetScroll);
    const timeout = window.setTimeout(resetScroll, 80);

    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}
