'use client';

import { motion, useScroll, useTransform } from 'framer-motion';

const stats = [
  ['3', 'формата бань'],
  ['24/7', 'работаем'],
  ['400 ₽', 'доп. гость'],
];

export default function Hero() {
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

  return (
    <section className="hero-section relative min-h-screen overflow-hidden bg-[#090806] pt-[76px]">
      <motion.img
        src="/images/20250721_204935.jpg"
        alt="Баня Море на берегу моря"
        style={{ y }}
        className="hero-image-motion absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,8,6,0.96)_0%,rgba(9,8,6,0.76)_34%,rgba(9,8,6,0.28)_66%,rgba(9,8,6,0.78)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-[#090806] via-[#090806]/72 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#090806]/90 to-transparent" />

      <div className="relative z-10 flex min-h-[calc(100vh-76px)] w-full flex-col justify-end px-5 pb-8 sm:px-8 lg:px-16 lg:pb-12 2xl:px-24">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,0.55fr)] lg:items-end">
          <motion.div
            initial={{ y: 34, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.72, ease: 'easeOut' }}
            className="max-w-4xl"
          >
            <h1 className="text-[clamp(2.75rem,5vw,6.15rem)] font-semibold leading-[0.94] text-[#f4eee4]">
              Русская баня
              <br />
              на берегу моря
            </h1>
            <p className="mt-7 max-w-3xl text-xl leading-9 text-[#e0d7ca] sm:text-[1.65rem] sm:leading-[1.55]">
              Пар на дровах, морской воздух и приватный отдых во Владивостоке.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a href="https://w1437834.yclients.com/" target="_blank" rel="noopener noreferrer" className="btn-primary h-16 px-8 py-0 text-[19px] leading-none">
                Забронировать
              </a>
              <a
                href="#about"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToAbout();
                }}
                className="btn-secondary h-16 px-8 py-0 text-[19px] leading-none"
              >
                О нас
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.72, delay: 0.14, ease: 'easeOut' }}
            className="grid grid-cols-3 gap-3 rounded-lg border border-[#d6a15f]/15 bg-[#100d09]/58 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(214,161,95,0.10)] backdrop-blur-xl lg:translate-y-[84px] lg:self-end"
          >
            {stats.map(([value, label]) => (
              <div key={label} className="text-center lg:text-left">
                <div className="text-3xl font-bold text-[#d6a15f] sm:text-4xl">{value}</div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b9aea0]">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.a
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          href="#about"
          className="mt-10 hidden w-fit items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#d8d0c4] transition hover:text-[#d6a15f] lg:inline-flex"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full border border-[#d6a15f]/25 text-[#d6a15f]">↓</span>
          Листайте вниз
        </motion.a>
      </div>
    </section>
  );
}
