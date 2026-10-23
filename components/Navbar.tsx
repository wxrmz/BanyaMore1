'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useCloseOnBack } from '@/lib/useCloseOnBack';
import { magneticRef } from '@/lib/magnetic';
import { isMac, smoothScrollTo } from '@/lib/smoothScroll';
import DocumentLightbox, { type SiteDocument } from './DocumentLightbox';

type Theme = 'dark' | 'light';

const navLinks = [
  { name: 'О нас', href: '#about' },
  { name: 'Бани', href: '#baths' },
  { name: 'Запись', href: '#schedule' },
  { name: 'Галерея', href: '#gallery' },
  { name: 'Контакты', href: '#contacts' },
  { name: 'Меню', href: '/documents/banya-more-menu.pdf', external: true },
  { name: 'Услуги', href: '/documents/banya-more-services.pdf', external: true },
];

// Меню и услуги показываем картинками в окне просмотра, как фото в галерее.
// PDF остаётся в href: его можно открыть средней кнопкой мыши.
const documents: Record<string, SiteDocument> = {
  '/documents/banya-more-menu.pdf': {
    title: 'Меню',
    pages: ['/documents/banya-more-menu-1.jpg', '/documents/banya-more-menu-2.jpg'],
  },
  '/documents/banya-more-services.pdf': {
    title: 'Услуги',
    pages: ['/documents/banya-more-services-1.jpg'],
  },
};

// Мобильное меню уезжает 420 мс (globals.css). Окно документа открываем после,
// иначе запись истории закрывающегося меню сразу закрыла бы и его.
const OPEN_DOCUMENT_AFTER_MENU_MS = 450;
// На Mac разделы останавливались чуть высоко — докручиваем ещё немного.
// «О нас» и «Контакты» начинаются с большого отступа, им — побольше.
const MAC_EXTRA_DOWN: Record<string, number> = { '#about': 45, '#contacts': 45 };
const MAC_EXTRA_DOWN_DEFAULT = 20;

const sectionLinks =navLinks.filter((link) => !link.external);

const getHeaderScrollThreshold = () => (window.innerWidth < 1024 ? 96 : 24);

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [hasToggledTheme, setHasToggledTheme] = useState(false);
  const [openDocument, setOpenDocument] = useState<SiteDocument | null>(null);
  const menuScrollYRef = useRef(0);
  const pendingMenuTargetRef = useRef<number | null>(null);
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 110, damping: 24, restDelta: 0.001 });

  useCloseOnBack(isOpen, () => setIsOpen(false));

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('banyamore-theme') === 'light' ? 'light' : 'dark';
    setTheme(savedTheme);
    document.documentElement.dataset.theme = savedTheme;
  }, []);

  useEffect(() => {
    let isInitialResetComplete = false;
    const onScroll = () => {
      if (isInitialResetComplete) {
        setIsScrolled(window.scrollY > getHeaderScrollThreshold());
      }
    };
    const initialSync = window.setTimeout(() => {
      isInitialResetComplete = true;
      onScroll();
    }, 140);

    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onScroll);
    return () => {
      window.clearTimeout(initialSync);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    const targets = sectionLinks
      .map((link) => document.querySelector<HTMLElement>(link.href))
      .filter((el): el is HTMLElement => el !== null);
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const href = `#${entry.target.id}`;
          if (entry.isIntersecting) visible.add(href);
          else visible.delete(href);
        });
        setActiveHref(sectionLinks.find((link) => visible.has(link.href))?.href ?? null);
      },
      { rootMargin: '-45% 0px -54% 0px' },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const placeIndicator = useCallback(() => {
    const nav = navRef.current;
    const pill = indicatorRef.current;
    if (!nav || !pill) return;
    const target = hoveredHref ?? activeHref;
    const link = target ? nav.querySelector<HTMLElement>(`a[href="${target}"]`) : null;
    if (!link) {
      pill.style.opacity = '0';
      return;
    }
    pill.style.width = `${link.offsetWidth}px`;
    pill.style.height = `${link.offsetHeight}px`;
    pill.style.transform = `translate(${link.offsetLeft}px, ${link.offsetTop}px)`;
    pill.style.opacity = '1';
  }, [activeHref, hoveredHref]);

  useLayoutEffect(placeIndicator, [placeIndicator]);
  useEffect(() => {
    window.addEventListener('resize', placeIndicator);
    return () => window.removeEventListener('resize', placeIndicator);
  }, [placeIndicator]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const scrollY = window.scrollY;

    menuScrollYRef.current = scrollY;
    pendingMenuTargetRef.current = null;

    return () => {
      const targetTop = pendingMenuTargetRef.current;
      pendingMenuTargetRef.current = null;

      if (targetTop !== null) {
        smoothScrollTo(targetTop);
        setIsScrolled(targetTop > getHeaderScrollThreshold());
      }
    };
  }, [isOpen]);

  const goTo = (href: string, external?: boolean) => {
    if (external) {
      const doc = documents[href];
      if (!doc) {
        setIsOpen(false);
        window.open(href, '_blank', 'noopener,noreferrer');
        return;
      }
      if (isOpen) {
        setIsOpen(false);
        window.setTimeout(() => setOpenDocument(doc), OPEN_DOCUMENT_AFTER_MENU_MS);
        return;
      }
      setOpenDocument(doc);
      return;
    }

    const target = document.querySelector(href);
    if (!target) {
      return;
    }

    const headerOffset = 76;
    const isMobileMenuNavigation = isOpen && window.innerWidth <= 639;
    const extraDown = href === '#about' ? 24 : href === '#baths' ? (isMobileMenuNavigation ? 70 : 44) : href === '#schedule' ? 36 : href === '#gallery' ? 72 : 0;
    const currentScrollY = isOpen ? menuScrollYRef.current : window.scrollY;
    const macExtraDown = isMac() ? (MAC_EXTRA_DOWN[href] ?? MAC_EXTRA_DOWN_DEFAULT) : 0;
    const top = target.getBoundingClientRect().top + currentScrollY - headerOffset + extraDown + macExtraDown;

    if (isOpen) {
      pendingMenuTargetRef.current = top;
      setIsOpen(false);
      return;
    }

    smoothScrollTo(top);
  };

  // Кружок и перекраска страницы идут одновременно. Браузер делает снимок
  // старой темы и растворяет его в новой (::view-transition-* в globals.css),
  // а сам переключатель вынесен из снимка и рисуется вживую, поэтому его
  // кружок едет в такт с перекраской, а не замирает на тяжёлой перерисовке.
  const toggleTheme = (button: HTMLButtonElement) => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    window.localStorage.setItem('banyamore-theme', nextTheme);
    const applyTheme = () => {
      // Атрибут ставим сразу, не дожидаясь React, чтобы кружок поехал
      // в том же кадре, что и смена темы; React выставит то же значение.
      document.querySelectorAll<HTMLElement>('.theme-toggle').forEach((button) => {
        button.dataset.target = nextTheme;
      });
      document.documentElement.dataset.theme = nextTheme;
      setTheme(nextTheme);
      setHasToggledTheme(true);
    };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || typeof document.startViewTransition !== 'function') {
      applyTheme();
      return;
    }
    // Во время перехода браузер снимает :hover с кнопки, а после него
    // возвращает только при следующем движении мыши. Поэтому вид наведения
    // держим сами по реальному положению курсора: увёл курсор — сразу
    // снимаем, остался на кнопке — держим до первого движения мыши.
    const holdHover = button.matches(':hover') && window.matchMedia('(hover: hover)').matches;
    if (holdHover) {
      button.dataset.hover = '';
    }
    let pointerInside = holdHover;
    const trackPointer = (event: PointerEvent) => {
      const rect = button.getBoundingClientRect();
      pointerInside =
        event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (pointerInside) button.dataset.hover = '';
      else delete button.dataset.hover;
    };
    if (holdHover) {
      window.addEventListener('pointermove', trackPointer);
    }
    document.startViewTransition(applyTheme).finished.finally(() => {
      if (!holdHover) return;
      window.removeEventListener('pointermove', trackPointer);
      if (!pointerInside) {
        delete button.dataset.hover;
        return;
      }
      const release = () => {
        delete button.dataset.hover;
        window.removeEventListener('pointermove', release);
      };
      window.addEventListener('pointermove', release);
    });
  };

  const renderThemeButton = () => (
    <button
      type="button"
      onClick={(event) => toggleTheme(event.currentTarget)}
      className="theme-toggle"
      data-target={hasToggledTheme ? theme : undefined}
      aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
      aria-pressed={theme === 'light'}
      title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__icon theme-toggle__icon--sun">
          <svg viewBox="0 0 24 24" focusable="false">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
          </svg>
        </span>
        <span className="theme-toggle__icon theme-toggle__icon--moon">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M20.5 14.6A7.8 7.8 0 0 1 9.4 3.5a8.8 8.8 0 1 0 11.1 11.1Z" />
          </svg>
        </span>
        <span className="theme-toggle__thumb" />
      </span>
    </button>
  );

  return (
    <>
      <motion.header
        className={`site-header fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          isOpen
            ? 'site-header--scrolled site-header--menu-open bg-[#090806]/78 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl'
            : isScrolled
            ? 'site-header--scrolled bg-[#090806]/78 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl'
            : 'site-header--top bg-transparent shadow-none backdrop-blur-none'
        }`}
      >
        <motion.div className="absolute inset-x-0 top-0 h-px origin-left bg-[#d6a15f]" style={{ scaleX }} />
        <div className="container-custom">
          <div className="flex h-[76px] translate-x-3 items-center justify-between">
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                smoothScrollTo(0);
              }}
              className="group flex items-center"
              aria-label="Баня Море, наверх"
            >
              <span>
                <span className="block font-serif text-2xl leading-none text-[#f4eee4]">Баня Море</span>
                <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b9aea0]">
                  Владивосток
                </span>
              </span>
            </a>

            <div className="hidden items-center gap-2 xl:flex">
              <nav
                ref={navRef}
                className="navbar-pill relative flex items-center rounded-full border border-[#d6a15f]/20 bg-[#21170f]/50 px-3 py-2 shadow-[inset_0_1px_0_rgba(214,161,95,0.10),0_18px_55px_rgba(0,0,0,0.22)] backdrop-blur-xl"
                aria-label="Основная навигация"
                onMouseLeave={() => setHoveredHref(null)}
              >
                <span ref={indicatorRef} className="navbar-indicator" aria-hidden="true" />
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={(event) => {
                      event.preventDefault();
                      goTo(link.href, link.external);
                    }}
                    onMouseEnter={() => setHoveredHref(link.href)}
                    onFocus={() => setHoveredHref(link.href)}
                    onBlur={() => setHoveredHref(null)}
                    data-on={(hoveredHref ?? activeHref) === link.href || undefined}
                    aria-current={activeHref === link.href ? 'location' : undefined}
                    className="navbar-link relative rounded-full px-4 py-2 text-[15px] font-semibold text-[#d8d0c4]"
                  >
                    <span className="inline-block scale-[1.22]">{link.name}</span>
                  </a>
                ))}
              </nav>
              {renderThemeButton()}
            </div>

            <div className="flex items-center gap-3">
              <span className="relative hidden sm:block">
                <span
                  aria-hidden="true"
                  className="invisible flex h-12 items-center justify-center rounded-xl border border-[#d6a15f]/45 px-6 text-base font-extrabold"
                >
                  +7 908 440 20 55
                </span>
                <a
                  ref={magneticRef}
                  href="tel:+79084402055"
                  className="navbar-phone-link absolute -left-6 top-0 flex h-12 items-center justify-center overflow-hidden rounded-xl border border-[#d6a15f] bg-[#d6a15f] px-6 text-[17px] font-extrabold text-[#16110c]"
                >
                  <span className="inline-block translate-y-[1.5px] scale-[1.06]">+7 908 440 20 55</span>
                </a>
              </span>
              <div className="xl:hidden">{renderThemeButton()}</div>
              <button
                type="button"
                onClick={() => setIsOpen((value) => !value)}
                className="navbar-menu-button inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#d6a15f]/25 bg-[#21170f]/60 text-[#f4eee4] shadow-[inset_0_1px_0_rgba(214,161,95,0.12)] transition hover:border-[#d6a15f]/45 hover:bg-[#21170f]/80 xl:hidden"
                aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
              >
                <span className={`navbar-burger ${isOpen ? 'is-open' : ''}`} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <div
        className={`mobile-menu-overlay fixed inset-0 z-40 touch-none bg-[#090806]/78 xl:hidden ${isOpen ? 'is-open' : ''}`}
        aria-hidden={!isOpen}
        onClick={() => setIsOpen(false)}
      >
        <nav
          className="mobile-menu-panel ml-auto flex h-full w-[min(78vw,320px)] touch-pan-y flex-col gap-2 overflow-y-auto overscroll-contain rounded-l-2xl border-l border-[#d6a15f]/20 bg-[#11100d] p-5 pt-24 shadow-[-24px_0_80px_rgba(0,0,0,0.36)]"
          onClick={(event) => event.stopPropagation()}
        >
          {navLinks.map((link, index) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(event) => {
                event.preventDefault();
                goTo(link.href, link.external);
              }}
              style={{ '--i': index } as CSSProperties}
              className="mobile-menu-link mobile-menu-item rounded-lg border border-[#d6a15f]/15 bg-[#21170f]/45 px-4 py-4 text-lg font-semibold text-[#f4eee4] transition hover:bg-[#d6a15f]/15"
            >
              {link.name}
            </a>
          ))}
          <a
            href="tel:+79084402055"
            style={{ '--i': navLinks.length } as CSSProperties}
            className="btn-primary mobile-menu-item mt-3 w-full"
          >
            +7 908 440 20 55
          </a>
        </nav>
      </div>

      <DocumentLightbox document={openDocument} onClose={() => setOpenDocument(null)} />
    </>
  );
}
