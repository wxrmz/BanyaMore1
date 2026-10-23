import { animate, motionValue } from 'framer-motion';

// «Прилипание» кнопки к курсору, как в TourAgent: под курсором кнопка
// тянется к нему на 30% расстояния, а когда курсор уходит, пружинисто
// возвращается на место.
//
// Сдвиг пишется в CSS-свойство translate, а не в transform: у кнопок уже есть
// свой transform (увеличение, анимации появления), и его нельзя затирать.
//
// Использование: <button ref={magneticRef}>. React 19 вызывает возвращённую
// функцию при снятии ref, так что обработчики убираются сами.

const PULL = 0.3;
// Аналог power3.out из GSAP.
const FOLLOW = { duration: 0.4, ease: [0.215, 0.61, 0.355, 1] as const };
// Аналог elastic.out(1, 0.4): пружина с заметным «отскоком».
const RELEASE = { type: 'spring' as const, stiffness: 200, damping: 10 };

export function magneticRef(el: HTMLElement | null) {
  if (!el) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Свой слой отрисовки: кнопка в шапке лежит поверх размытого фона
  // (backdrop-filter), и при сдвиге без отдельного слоя Chrome оставлял
  // за ней «след» из полосок рамки.
  el.style.willChange = 'translate';

  const x = motionValue(0);
  const y = motionValue(0);
  const render = () => {
    el.style.translate = `${x.get()}px ${y.get()}px`;
  };
  const unsubscribeX = x.on('change', render);
  const unsubscribeY = y.on('change', render);

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    // Прямоугольник уже включает текущий сдвиг — вычитаем его, чтобы
    // считать от центра кнопки в покое.
    const rect = el.getBoundingClientRect();
    const centerX = rect.left - x.get() + rect.width / 2;
    const centerY = rect.top - y.get() + rect.height / 2;
    animate(x, (event.clientX - centerX) * PULL, FOLLOW);
    animate(y, (event.clientY - centerY) * PULL, FOLLOW);
  };

  const onLeave = () => {
    animate(x, 0, RELEASE);
    animate(y, 0, RELEASE);
  };

  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);

  return () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    unsubscribeX();
    unsubscribeY();
    x.stop();
    y.stop();
    el.style.translate = '';
    el.style.willChange = '';
  };
}
