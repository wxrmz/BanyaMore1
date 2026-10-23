// Домик бани на волнах с паром из трубы — знак экрана загрузки. Используется
// и на заставке сайта, и пока грузится расписание. Цвета и анимации —
// классы .site-preloader__* в globals.css (переменные --preloader-*).
export default function BathHouseMark() {
  return (
    <svg className="site-preloader__mark" viewBox="0 0 120 120" aria-hidden="true">
      {/* Домик повторяет логотип: крыша с бахромой, труба-«Т», торцы
          брёвен по бокам, окно и настил с балясинами на волнах. */}
      <g className="site-preloader__steam">
        <path d="M76 12c-4-4 4-7 0-11s4-7 0-11" />
        <path d="M82 13c-4-4 4-7 0-11s4-7 0-11" />
        <path d="M88 12c-4-4 4-7 0-11s4-7 0-11" />
      </g>
      <path className="site-preloader__line" d="M14 50 60 18l46 32" />
      <path className="site-preloader__line" d="M82 33.3V16m-5 0h10" />
      <path className="site-preloader__line site-preloader__line--thin" d="M30 38.9v6M40 31.9v6M50 24.9v6M70 24.9v6M90 38.9v6" />
      <g className="site-preloader__logs">
        <circle cx="28" cy="53" r="7" />
        <circle cx="28" cy="67" r="7" />
        <circle cx="28" cy="81" r="7" />
        <circle cx="92" cy="53" r="7" />
        <circle cx="92" cy="67" r="7" />
        <circle cx="92" cy="81" r="7" />
      </g>
      {/* На торце каждого бревна прямая черта от края к центру, как на логотипе:
          у верхнего сверху, у среднего справа, у нижнего снизу. */}
      <path className="site-preloader__line site-preloader__line--thin" d="M28 46v7M35 67h-7M28 88v-7M92 46v7M99 67h-7M92 88v-7" />
      <rect className="site-preloader__line" x="43" y="47" width="34" height="25" rx="1.5" />
      <path className="site-preloader__line" d="M60 47v25" />
      <path className="site-preloader__line" d="M16 88h88" />
      <path className="site-preloader__line site-preloader__line--thin" d="M24 88v9M32 88v9M40 88v9M48 88v9M56 88v9M64 88v9M72 88v9M80 88v9M88 88v9M96 88v9" />
      <path className="site-preloader__wave" d="M10 99c3.1-4 9.4-4 12.5 0 s9.4 4 12.5 0 s9.4-4 12.5 0 s9.4 4 12.5 0 s9.4-4 12.5 0 s9.4 4 12.5 0 s9.4-4 12.5 0 s9.4 4 12.5 0" />
      <path className="site-preloader__wave site-preloader__wave--second" d="M16 106c3.1-4 9.4-4 12.5 0 s9.4 4 12.5 0 s9.4-4 12.5 0 s9.4 4 12.5 0 s9.4-4 12.5 0 s9.4 4 12.5 0 s9.4-4 12.5 0" />
      <path className="site-preloader__wave site-preloader__wave--third" d="M22 113c3.1-4 9.4-4 12.5 0 s9.4 4 12.5 0 s9.4-4 12.5 0 s9.4 4 12.5 0 s9.4-4 12.5 0 s9.4 4 12.5 0" />
    </svg>
  );
}
