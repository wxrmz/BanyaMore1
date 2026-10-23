'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { heroReveal } from './heroReveal';
import { usePreloaderDone } from '@/lib/preloader';
import { attachNotchedFrame } from '@/lib/notchedFrame';

const stats = [
  { value: '3', label: 'Бани' },
  { value: '24/7', label: 'Режим работы' },
  { value: 'от 3000 ₽', label: 'за час' },
];

export default function Hero() {
  // Первый экран проявляется, когда уходит заставка загрузки.
  const revealed = usePreloaderDone();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 760], [0, 120]);
  const scrollToAbout = () => {
    const target = document.querySelector('#about');
    if (!target) {
      return;
    }

    const top = target.getBoundingClientRect().top + window.scrollY - 76 + 38;
    window.scrollTo({ top, behavior: 'smooth' });
  };
  const scrollToSchedule = () => {
    const target = document.querySelector('#schedule');
    if (!target) {
      return;
    }

    const top = target.getBoundingClientRect().top + window.scrollY - 76 + 52;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <section className="hero-section layer-high relative min-h-screen overflow-hidden bg-[#090806] pt-[76px]">
      {/* Готовые файлы в современных форматах: браузер берёт подходящий
          и начинает грузить сразу, без обработки на сервере. */}
      <motion.div style={{ y }} className="hero-image-motion absolute inset-0">
        <picture>
          <source media="(max-width: 900px)" type="image/avif" srcSet="/images/hero-mobile.avif" />
          <source media="(max-width: 900px)" type="image/webp" srcSet="/images/hero-mobile.webp" />
          <source type="image/avif" srcSet="/images/hero-main.avif" />
          <source type="image/webp" srcSet="/images/hero-main.webp" />
          <img
            src="/images/hero-main.jpg"
            alt="Баня Море на берегу моря"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover brightness-[1.04] saturate-[1.02]"
          />
        </picture>
      </motion.div>
      <div className="hero-overlay-side absolute inset-y-0 left-0 w-[92%] bg-[linear-gradient(90deg,rgba(9,8,6,0.94)_0%,rgba(9,8,6,0.9)_22%,rgba(9,8,6,0.81)_40%,rgba(9,8,6,0.67)_54%,rgba(9,8,6,0.48)_65%,rgba(9,8,6,0.33)_74%,rgba(9,8,6,0.22)_82%,rgba(9,8,6,0.12)_89%,rgba(9,8,6,0.05)_95%,rgba(9,8,6,0)_100%)]" />
      <div className="hero-overlay-bottom absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-[#090806]/95 via-[#090806]/62 to-transparent" />
      <div className="hero-overlay-top absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(9,8,6,0.8)_0%,rgba(9,8,6,0.76)_24%,rgba(9,8,6,0.52)_58%,rgba(9,8,6,0)_100%)]" />

      <div className="hero-inner relative z-10 flex min-h-[calc(100vh-76px)] w-full flex-col justify-end px-5 pb-8 sm:px-8 lg:px-16 lg:pb-12 2xl:px-24">
        <div className="hero-content-grid grid w-full gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-end">
          <motion.div
            initial={{ y: 34, opacity: 0 }}
            animate={revealed ? { y: 0, opacity: 1 } : undefined}
            transition={heroReveal}
            className="hero-main max-w-4xl lg:max-w-none"
          >
            <img
              src="/images/photo_2025-12-27_18-34-59-Photoroom.png"
              alt="Логотип Баня Море"
              className="hero-logo mx-auto mb-5 h-auto w-[150px] origin-bottom-right -translate-x-3 translate-y-6 scale-[1.32] drop-shadow-[0_18px_48px_rgba(0,0,0,0.64)] sm:w-[180px] lg:mb-6 lg:w-[230px] lg:scale-[1.45] 2xl:w-[280px]"
            />
            <h1 className="hero-title text-[clamp(1.95rem,2.9vw,4.1rem)] font-semibold leading-[0.98] text-[#f4eee4]">
              Оздоровительный
              <br />
              комплекс <span className="whitespace-nowrap">«Баня-Море»</span>
            </h1>
            <p className="hero-copy mt-7 max-w-3xl text-xl leading-9 text-[#e0d7ca] sm:text-[1.65rem] sm:leading-[1.55]">
              Русские бани на дровах, горячий пар
              <br />
              и приватный отдых во Владивостоке
            </p>
            <div className="hero-actions mt-10 flex -translate-y-1.5 flex-col gap-4 sm:flex-row">
              <a
                href="#schedule"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSchedule();
                }}
                className="fill-fx-btn btn-primary rounded-xl h-[76px] px-12 py-0 text-[24px] leading-none"
              >
                <span className="inline-block scale-[1.2]">Забронировать</span>
              </a>
              <a
                href="#about"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToAbout();
                }}
                className="fill-fx-btn hero-about-btn btn-secondary rounded-xl h-[76px] px-12 py-0 text-[24px] leading-none"
              >
                <span className="inline-block scale-[1.2]">О нас</span>
              </a>
            </div>
          </motion.div>

          {/* Появляются вместе с кнопками и так же, как они. Прозрачность
              анимируется у самих плашек, а не у общей обёртки: полупрозрачная
              обёртка отключает размытие фона (backdrop-filter) внутри неё,
              и плашки на время появления становились «стеклянными». */}
          <motion.div
            initial={{ y: 34 }}
            animate={revealed ? { y: 0 } : undefined}
            transition={heroReveal}
            className="hero-side flex flex-col gap-4 lg:relative lg:top-[-10px] lg:w-[min(100%,620px)] lg:justify-self-end lg:self-end"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={revealed ? { opacity: 1 } : undefined}
              transition={heroReveal}
              ref={attachNotchedFrame}
              className="hero-stats-panel notched-frame grid grid-cols-[0.72fr_1fr_1.28fr] divide-x divide-[#d6a15f]/20 rounded-lg border border-[#d6a15f]/15 bg-[#100d09]/58 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(214,161,95,0.10)] backdrop-blur-xl">
              {stats.map(({ value, label }) => (
                <div key={label} className="flex h-full flex-col items-center justify-center px-4 text-center first:pl-0 last:pr-0">
                  <div className="whitespace-nowrap text-3xl font-bold leading-none text-[#d6a15f] sm:text-4xl">{value}</div>
                  <div className="hero-stat-label mt-1 text-sm font-semibold uppercase leading-tight tracking-[0.1em] text-[#b9aea0] sm:text-[15px] lg:text-base">{label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
