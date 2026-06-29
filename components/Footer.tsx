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
    <footer className="relative bg-[#090806] py-10 text-[#f4eee4] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[#d6a15f]/25 before:to-transparent">
      <div
        className="absolute left-1/2 top-0 z-10 h-px w-[min(1424px,calc(100%-92px))] -translate-x-1/2 bg-[#9b6532]"
        aria-hidden="true"
      />
      <div className="container-custom">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto_auto] lg:items-start">
          <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.55 }}>
            <div className="font-serif text-[34px]">Баня Море</div>
            <p className="mt-3 h-14 max-w-md text-[17px] leading-7 text-[#b9aea0]">
              <span className="inline-block origin-left scale-[1.1]">
                Русская баня на берегу моря во Владивостоке: пар на дровах, кафе и приватный отдых.
              </span>
            </p>
          </motion.div>

          <motion.nav
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="relative top-3 flex flex-wrap gap-x-6 gap-y-3 lg:max-w-md"
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
                className="text-[15px] font-semibold text-[#d8d0c4] transition hover:text-[#d6a15f]"
              >
                <span className="inline-block scale-[1.18]">{link.name}</span>
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
                className="grid h-12 w-12 place-items-center rounded-lg border border-[#d6a15f]/55 bg-[#21170f]/45 text-[#d6a15f] shadow-[inset_0_1px_0_rgba(214,161,95,0.08)] transition hover:-translate-y-0.5 hover:border-[#d6a15f] hover:bg-[#d6a15f]/12 hover:text-[#f3d09b]"
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

        <div className="mt-14 flex -translate-y-3 flex-col gap-4 text-[15px] text-[#8f857a] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Баня Море. Все права защищены.</span>
          <a
            href="tel:+79084402055"
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-[#d6a15f]/55 px-5 text-base font-extrabold text-[#d6a15f] transition hover:border-[#d6a15f] hover:bg-[#d6a15f]/10 hover:text-[#f3d09b]"
          >
            +7 908 440 20 55
          </a>
        </div>
      </div>
    </footer>
  );
}
