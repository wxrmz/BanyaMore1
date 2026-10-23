// Рамка с вогнутыми (вырезанными) углами, как блоки в меню и прейскуранте.
// Форму задаёт clip-path, а окантовку рисует ::after по маске той же формы
// (стили .notched-frame в globals.css). Обе считаются от реального размера
// элемента и пересчитываются при его изменении.

const RADIUS = 14;

const notchedPath = (w: number, h: number, r: number) =>
  `M${r} 0H${w - r}A${r} ${r} 0 0 0 ${w} ${r}V${h - r}A${r} ${r} 0 0 0 ${w - r} ${h}H${r}A${r} ${r} 0 0 0 0 ${h - r}V${r}A${r} ${r} 0 0 0 ${r} 0Z`;

// Используется как ref: <div ref={attachNotchedFrame}>. React 19 сам вызовет
// возвращённую функцию очистки, когда элемент уйдёт со страницы.
export function attachNotchedFrame(el: HTMLElement | null) {
  if (!el) return;
  const update = () => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (!w || !h) return;
    const r = Math.min(RADIUS, w / 4, h / 4);
    const d = notchedPath(w, h, r);
    el.style.clipPath = `path('${d}')`;
    // Обводка шириной 2px по краю: половина срезается clip-path, видно 1px.
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><path d='${d}' fill='none' stroke='black' stroke-width='2'/></svg>`;
    el.style.setProperty('--notched-frame', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
  };

  update();
  const observer = new ResizeObserver(update);
  observer.observe(el);
  return () => {
    observer.disconnect();
    el.style.clipPath = '';
    el.style.removeProperty('--notched-frame');
  };
}
