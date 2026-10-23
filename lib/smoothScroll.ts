// Плавная прокрутка страницы к точке.
//
// На Mac встроенная плавная прокрутка браузера (behavior: 'smooth') быстрая
// и рваная: резко срывается с места и так же резко тормозит. Поэтому на Mac
// прокручиваем сами — с мягким разгоном и торможением и длительностью от
// расстояния, примерно как прокрутка в Chrome на Windows. На остальных
// устройствах остаётся прокрутка браузера.

const MIN_MS = 650;
const MAX_MS = 1250;
const MS_PER_PX = 0.11;
const STOP_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

let stopCurrent: (() => void) | null = null;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Mac с мышью или тачпадом; iPad в режиме «как компьютер» тоже называет
// себя MacIntel, но у него сенсорный экран — его не трогаем.
export const isMac = () => /Mac/.test(navigator.platform) && navigator.maxTouchPoints === 0;

export function smoothScrollTo(top: number) {
  stopCurrent?.();

  if (!isMac() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo({ top, behavior: 'smooth' });
    return;
  }

  const start = window.scrollY;
  const maxTop = document.documentElement.scrollHeight - window.innerHeight;
  const target = Math.max(0, Math.min(top, maxTop));
  const distance = target - start;
  if (Math.abs(distance) < 1) return;

  const duration = Math.min(MAX_MS, Math.max(MIN_MS, MIN_MS + Math.abs(distance) * MS_PER_PX));
  const startedAt = performance.now();
  let frame = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    STOP_EVENTS.forEach((type) => window.removeEventListener(type, stop, true));
    if (stopCurrent === stop) stopCurrent = null;
  };

  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    // 'instant' перекрывает scroll-behavior: smooth у html, иначе каждый
    // кадр браузер сам растягивал бы в анимацию.
    window.scrollTo({ top: start + distance * easeInOutCubic(progress), behavior: 'instant' });
    if (progress < 1) {
      frame = requestAnimationFrame(step);
    } else {
      stop();
    }
  };

  // Колесо, касание или клавиша посетителя прерывают прокрутку.
  STOP_EVENTS.forEach((type) => window.addEventListener(type, stop, { capture: true, passive: true }));
  stopCurrent = stop;
  frame = requestAnimationFrame(step);
}
