'use client';

import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';

const navLinks = [
  { name: 'О нас', href: '#about' },
  { name: 'Бани', href: '#baths' },
  { name: 'Галерея', href: '#gallery' },
  { name: 'Контакты', href: '#contacts' },
  { name: 'Меню', href: '/menu_more.pdf', external: true },
];

function LogoMark() {
  return (
    <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl border-2 border-[#d6a15f]/55 bg-[#d6a15f]/12 text-[#f3d09b] shadow-[inset_0_1px_0_rgba(214,161,95,0.12)] transition group-hover:bg-[#d6a15f]/20">
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="h-[34px] w-[34px] translate-x-[0.5px] translate-y-[0.5px]"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4.8"
      >
        <path d="M8 20c5.4-5.6 10.8-5.6 16.2 0s10.8 5.6 16.2 0 10.8-5.6 16.2 0" />
        <path d="M8 32c5.4-5.6 10.8-5.6 16.2 0s10.8 5.6 16.2 0 10.8-5.6 16.2 0" />
        <path d="M8 44c5.4-5.6 10.8-5.6 16.2 0s10.8 5.6 16.2 0 10.8-5.6 16.2 0" />
      </svg>
    </span>
  );
}

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 110, damping: 24, restDelta: 0.001 });

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = (href: string, external?: boolean) => {
    setIsOpen(false);
    if (external) {
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }

    const target = document.querySelector(href);
    if (!target) {
      return;
    }

    const headerOffset = 76;
    const extraDown = href === '#about' ? 38 : href === '#baths' ? 44 : href === '#gallery' ? 72 : 0;
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset + extraDown;

    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, filter: 'blur(10px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.42, ease: 'easeOut' }}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-[#090806]/78 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl' : 'bg-transparent'
        }`}
      >
        <motion.div className="absolute inset-x-0 top-0 h-px origin-left bg-[#d6a15f]" style={{ scaleX }} />
        <div className="container-custom">
          <div className="flex h-[76px] items-center justify-between">
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="group flex items-center gap-3"
              aria-label="Баня Море, наверх"
            >
              <LogoMark />
              <span>
                <span className="block font-serif text-2xl leading-none text-[#f4eee4]">Баня Море</span>
                <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b9aea0]">
                  Владивосток
                </span>
              </span>
            </a>

            <nav
              className="hidden items-center rounded-full border border-[#d6a15f]/20 bg-[#21170f]/50 px-3 py-2 shadow-[inset_0_1px_0_rgba(214,161,95,0.10),0_18px_55px_rgba(0,0,0,0.22)] backdrop-blur-xl lg:flex"
              aria-label="Основная навигация"
            >
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(event) => {
                    event.preventDefault();
                    goTo(link.href, link.external);
                  }}
                  className="rounded-full px-4 py-2 text-[15px] font-semibold text-[#d8d0c4] transition hover:bg-[#d6a15f]/12 hover:text-[#d6a15f]"
                >
                  {link.name}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <a
                href="tel:+79084402055"
                className="hidden rounded-lg border border-[#d6a15f]/45 bg-[#d6a15f]/10 px-4 py-2.5 text-sm font-bold text-[#d6a15f] transition hover:bg-[#d6a15f] hover:text-[#16110c] sm:inline-flex"
              >
                +7 908 440 20 55
              </a>
              <button
                type="button"
                onClick={() => setIsOpen((value) => !value)}
                className="grid h-11 w-11 place-items-center rounded-lg border border-[#d6a15f]/20 bg-[#21170f]/55 text-[#f4eee4] shadow-[inset_0_1px_0_rgba(214,161,95,0.10)] lg:hidden"
                aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
              >
                <span className="relative h-4 w-5">
                  <span className={`absolute left-0 top-0 h-0.5 w-5 bg-current transition ${isOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
                  <span className={`absolute left-0 top-[7px] h-0.5 w-5 bg-current transition ${isOpen ? 'opacity-0' : ''}`} />
                  <span className={`absolute left-0 top-[14px] h-0.5 w-5 bg-current transition ${isOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#090806]/78 backdrop-blur-md lg:hidden"
            onClick={() => setIsOpen(false)}
          >
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
              className="ml-auto flex h-full w-[min(88vw,380px)] flex-col gap-3 border-l border-[#d6a15f]/20 bg-[#11100d] p-6 pt-24 shadow-[-24px_0_80px_rgba(0,0,0,0.36)]"
              onClick={(event) => event.stopPropagation()}
            >
              {navLinks.map((link, index) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  initial={{ x: 24, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.045 }}
                  onClick={(event) => {
                    event.preventDefault();
                    goTo(link.href, link.external);
                  }}
                  className="rounded-lg border border-[#d6a15f]/15 bg-[#21170f]/45 px-4 py-4 text-lg font-semibold text-[#f4eee4] transition hover:bg-[#d6a15f]/10"
                >
                  {link.name}
                </motion.a>
              ))}
              <a href="tel:+79084402055" className="btn-primary mt-3 w-full">
                Позвонить
              </a>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
