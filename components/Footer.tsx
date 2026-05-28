'use client';

import { motion } from 'framer-motion';

const links = [
  { name: 'О нас', href: '#about' },
  { name: 'Бани', href: '#baths' },
  { name: 'Галерея', href: '#gallery' },
  { name: 'Контакты', href: '#contacts' },
];

const socials = [
  {
    name: 'Telegram',
    href: 'https://t.me/Banyam0rerf',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
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
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
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
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
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
    <footer className="relative bg-[#090806] py-10 text-[#f4eee4] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[#d6a15f]/25 before:to-transparent">
      <div className="container-custom">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto_auto] lg:items-start">
          <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.55 }}>
            <div className="font-serif text-3xl">Баня Море</div>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#b9aea0]">
              Русская баня на берегу моря во Владивостоке: пар на дровах, террасы и приватный отдых.
            </p>
          </motion.div>

          <motion.nav
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="flex flex-wrap gap-x-6 gap-y-3 lg:max-w-md"
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
                className="text-sm font-semibold text-[#d8d0c4] transition hover:text-[#d6a15f]"
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
            className="flex gap-3"
          >
            {socials.map((social) => (
              <a
                key={social.name}
                className="grid h-11 w-11 place-items-center rounded-lg border border-[#d6a15f]/18 bg-[#21170f]/45 text-[#d6a15f] shadow-[inset_0_1px_0_rgba(214,161,95,0.08)] transition hover:-translate-y-0.5 hover:border-[#d6a15f]/45 hover:bg-[#d6a15f]/12 hover:text-[#f3d09b]"
                href={social.href}
                target={social.href.startsWith('http') ? '_blank' : undefined}
                rel={social.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                aria-label={social.name}
              >
                {social.icon}
              </a>
            ))}
          </motion.div>
        </div>

        <div className="relative mt-10 flex flex-col gap-3 pt-6 text-xs text-[#8f857a] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[#d6a15f]/22 before:to-transparent sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Баня Море. Все права защищены.</span>
          <span>Современный интерфейс: фото, движение, быстрый выбор и запись.</span>
        </div>
      </div>
    </footer>
  );
}
