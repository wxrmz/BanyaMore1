'use client';

import { motion, useScroll, useTransform } from 'framer-motion';

const stats = [
  ['4', 'Бани'],
  ['24/7', 'Работаем'],
  ['400 ₽', 'доп. гости'],
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
  const scrollToSchedule = () => {
    const target = document.querySelector('#schedule');
    if (!target) {
      return;
    }

    const top = target.getBoundingClientRect().top + window.scrollY - 76 + 52;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <section className="hero-section relative min-h-screen overflow-hidden bg-[#090806] pt-[76px]">
      <motion.img
        src="/images/20250721_204935.jpg"
        alt="Баня Море на берегу моря"
        style={{ y }}
        className="hero-image-motion absolute inset-0 h-full w-full object-cover brightness-[1.04] saturate-[1.02]"
      />
      <div className="absolute inset-y-0 left-0 w-[92%] bg-[linear-gradient(90deg,rgba(9,8,6,0.94)_0%,rgba(9,8,6,0.9)_22%,rgba(9,8,6,0.81)_40%,rgba(9,8,6,0.67)_54%,rgba(9,8,6,0.48)_65%,rgba(9,8,6,0.33)_74%,rgba(9,8,6,0.22)_82%,rgba(9,8,6,0.12)_89%,rgba(9,8,6,0.05)_95%,rgba(9,8,6,0)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-[#090806]/95 via-[#090806]/62 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(9,8,6,0.8)_0%,rgba(9,8,6,0.76)_24%,rgba(9,8,6,0.52)_58%,rgba(9,8,6,0)_100%)]" />

      <div className="relative z-10 flex min-h-[calc(100vh-76px)] w-full flex-col justify-end px-5 pb-8 sm:px-8 lg:px-16 lg:pb-12 2xl:px-24">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,40%)_minmax(0,60%)] lg:items-end">
          <motion.div
            initial={{ y: 34, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.72, ease: 'easeOut' }}
            className="max-w-4xl lg:max-w-none"
          >
            <img
              src="/images/photo_2025-12-27_18-34-59-Photoroom.png"
              alt="Логотип Баня Море"
              className="mx-auto mb-5 h-auto w-[150px] origin-bottom-right -translate-x-3 translate-y-3 scale-[1.32] drop-shadow-[0_18px_48px_rgba(0,0,0,0.64)] sm:w-[180px] lg:mb-6 lg:w-[230px] lg:scale-[1.45] 2xl:w-[280px]"
            />
            <h1 className="text-[clamp(2.75rem,4.5vw,6.15rem)] font-semibold leading-[0.94] text-[#f4eee4]">
              Русская баня
              <br />
              на берегу моря
            </h1>
            <p className="mt-7 max-w-3xl text-xl leading-9 text-[#e0d7ca] sm:text-[1.65rem] sm:leading-[1.55]">
              Пар на дровах, морской воздух и приватный отдых во Владивостоке.
            </p>
            <div className="mt-10 flex -translate-y-3 flex-col gap-3 sm:flex-row">
              <a
                href="#schedule"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSchedule();
                }}
                className="btn-primary h-16 px-8 py-0 text-[19px] leading-none"
              >
                <span className="inline-block scale-[1.08]">Забронировать</span>
              </a>
              <a
                href="#about"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToAbout();
                }}
                className="btn-secondary h-16 px-8 py-0 text-[19px] leading-none"
              >
                <span className="inline-block scale-[1.08]">О нас</span>
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.72, delay: 0.14, ease: 'easeOut' }}
            className="grid grid-cols-3 gap-3 rounded-lg border border-[#d6a15f]/15 bg-[#100d09]/58 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(214,161,95,0.10)] backdrop-blur-xl lg:relative lg:top-[-10px] lg:w-[min(100%,620px)] lg:justify-self-end lg:self-end"
          >
            {stats.map(([value, label]) => (
              <div key={label} className="text-center lg:text-left">
                <div className="text-3xl font-bold text-[#d6a15f] sm:text-4xl">{value}</div>
                <div className="mt-1 text-sm font-semibold uppercase tracking-[0.1em] text-[#b9aea0] sm:text-[15px] lg:text-base">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
}
