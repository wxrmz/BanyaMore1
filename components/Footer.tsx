'use client';

import { motion } from 'framer-motion';

const links = [
  { name: 'О нас', href: '#about' },
  { name: 'Бани', href: '#baths' },
  { name: 'Запись', href: '#schedule' },
  { name: 'Галерея', href: '#gallery' },
  { name: 'Контакты', href: '#contacts' },
];

const socials = [
  {
    name: 'Telegram',
    href: 'https://t.me/Banyam0rerf',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8">
        <path
          fill="currentColor"
          d="M21.6 4.2 18.3 20c-.25 1.12-.9 1.4-1.82.87l-5.02-3.7-2.42 2.33c-.27.27-.5.5-1.02.5l.36-5.12 9.32-8.42c.4-.36-.09-.56-.63-.2L5.55 13.5.6 11.95c-1.08-.34-1.1-1.08.22-1.6L20.2 2.88c.9-.34 1.68.2 1.4 1.32Z"
        />
      </svg>
    ),
  },
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/banya_more?igsh=dm50NnV5cW5neGJy',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9">
        <rect width="16" height="16" x="4" y="4" rx="4.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="17" cy="7" r="1.15" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: 'Email',
    href: 'mailto:banyan.more.rf@gmail.com',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-10 w-10">
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
          d="M4.75 6.75h14.5v10.5H4.75V6.75Zm.5.7 6.75 5.2 6.75-5.2"
        />
      </svg>
    ),
  },
];

export default function Footer() {
  const scroll = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <footer className="layer-footer relative bg-[#090806] py-10 text-[#f4eee4]">
      <div className="container-custom">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto_auto] lg:items-start">
          <motion.div className="footer-brand" initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.55 }}>
            <div className="font-serif text-[34px]">Баня Море</div>
            <p className="mt-3 h-14 max-w-md text-[17px] leading-7 text-[#b9aea0]">
              <span className="inline-block origin-left scale-[1.1]">
                Оздоровительный комплекс на берегу моря во Владивостоке: пар на дровах, кафе и приватный отдых.
              </span>
            </p>
          </motion.div>

          <motion.nav
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="footer-nav relative top-[25px] flex gap-x-6 sm:top-[22px] lg:top-3"
            aria-label="Навигация в футере"
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => {
                  event.preventDefault();
                  scroll(link.href);
                }}
                className="footer-nav-link inline-block origin-center -translate-y-2 scale-[1.36] rounded-full px-3.5 py-1.5 text-[15px] font-semibold text-[#d8d0c4] transition hover:bg-[#d6a15f]/12 hover:text-[#d6a15f]"
              >
                {link.name}
              </a>
            ))}
          </motion.nav>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="footer-socials relative flex gap-3 max-sm:top-[13px] max-sm:gap-6"
          >
            {socials.map((social) => (
              <a
                key={social.name}
                className="footer-social-link grid h-12 w-12 place-items-center rounded-lg border border-[#d6a15f]/55 bg-[#21170f]/45 text-[#d6a15f] shadow-[inset_0_1px_0_rgba(214,161,95,0.08)] transition hover:-translate-y-0.5 hover:border-[#d6a15f] hover:bg-[#d6a15f]/12 hover:text-[#f3d09b] max-sm:scale-110"
                href={social.href}
                target={social.href.startsWith('http') ? '_blank' : undefined}
                rel={social.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                aria-label={social.name}
              >
                {social.icon}
              </a>
            ))}
            <a
              href="tel:+79084402055"
              className="inline-flex min-h-12 w-[158px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#d6a15f]/55 px-3 text-base font-extrabold text-[#d6a15f] transition hover:border-[#d6a15f] hover:bg-[#d6a15f]/10 hover:text-[#f3d09b] max-[359px]:scale-[0.825] max-sm:relative max-sm:left-0.5 max-sm:scale-110 sm:hidden"
            >
              <span className="relative -left-px">+7 908 440 20 55</span>
            </a>
          </motion.div>
        </div>

        <div className="footer-bottom mt-14 flex -translate-y-3 flex-col gap-4 text-[15px] text-[#8f857a] sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-block origin-left translate-y-[6px] scale-[1.1]">
            © {new Date().getFullYear()} Баня Море. Все права защищены.
          </span>
          <span className="hidden [transform:translateY(-8px)_scale(1.14)] sm:inline-block">
            <a
              href="tel:+79084402055"
              className="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-[#d6a15f]/55 px-5 text-base font-extrabold text-[#d6a15f] transition hover:border-[#d6a15f] hover:bg-[#d6a15f]/10 hover:text-[#f3d09b]"
            >
              +7 908 440 20 55
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
