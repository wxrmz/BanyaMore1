'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const contacts = [
  { label: 'Телефон', value: '+7 908 440 20 55', href: 'tel:+79084402055', icon: 'phone' },
  { label: 'Telegram', value: '@Banyam0rerf', href: 'https://t.me/Banyam0rerf', icon: 'telegram' },
  { label: 'Instagram', value: '@banya_more', href: 'https://www.instagram.com/banya_more?igsh=dm50NnV5cW5neGJy', icon: 'instagram' },
  { label: 'Email', value: 'banyan.more.rf@gmail.com', href: 'mailto:banyan.more.rf@gmail.com', icon: 'email' },
];

function ContactIcon({ name }: { name: string }) {
  if (name === 'telegram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8">
        <path
          fill="currentColor"
          d="M21.6 4.2 18.3 20c-.25 1.12-.9 1.4-1.82.87l-5.02-3.7-2.42 2.33c-.27.27-.5.5-1.02.5l.36-5.12 9.32-8.42c.4-.36-.09-.56-.63-.2L5.55 13.5.6 11.95c-1.08-.34-1.1-1.08.22-1.6L20.2 2.88c.9-.34 1.68.2 1.4 1.32Z"
        />
      </svg>
    );
  }

  if (name === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9">
        <rect width="15.5" height="15.5" x="4.25" y="4.25" rx="4" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="12" cy="12" r="3.15" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="16.9" cy="7.1" r="1.1" fill="currentColor" />
      </svg>
    );
  }

  if (name === 'email') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9">
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
          d="M3.5 5.75h17v12.5h-17V5.75Zm.75.8L12 12.6l7.75-6.05"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9">
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
        d="M6.6 4.75 9 4.2l2.1 4.75-1.55 1.1a9.6 9.6 0 0 0 4.4 4.4l1.1-1.55L19.8 15l-.55 2.4c-.25 1.08-1.22 1.85-2.34 1.85C10.2 19.25 4.75 13.8 4.75 7.1c0-1.12.77-2.09 1.85-2.35Z"
      />
    </svg>
  );
}

export default function Contacts() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-120px' });

  return (
    <section id="contacts" className="section scroll-mt-20 bg-[#090806]" ref={ref}>
      <div className="container-custom">
        <div className="grid gap-8 lg:grid-cols-[0.58fr_1fr] lg:items-stretch">
          <motion.div
            initial={{ y: 36, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.65 }}
            className="flex flex-col justify-between"
          >
            <div>
              <div className="eyebrow">Контакты</div>
              <h2 className="section-title mt-5">Приезжайте к морю.</h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#cfc5b8]">
                Владивосток, район мыса Токаревского. Перед выездом лучше сверить дорогу по телефону или в Telegram.
              </p>
            </div>

            <div className="mt-10 grid gap-3">
              {contacts.map((item, index) => (
                <motion.a
                  key={item.label}
                  initial={{ x: -24, opacity: 0 }}
                  animate={isInView ? { x: 0, opacity: 1 } : {}}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                  href={item.href}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="group flex items-center justify-between gap-4 rounded-lg border border-[#d6a15f]/15 bg-[#21170f]/50 px-5 py-4 shadow-[inset_0_1px_0_rgba(214,161,95,0.08)] transition hover:border-[#d6a15f]/55 hover:bg-[#d6a15f]/10"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[#d6a15f]/55 bg-[#d6a15f]/10 text-[#d6a15f] shadow-[inset_0_1px_0_rgba(214,161,95,0.10)] transition group-hover:border-[#d6a15f] group-hover:bg-[#d6a15f]/14 group-hover:text-[#f3d09b]">
                      <ContactIcon name={item.icon} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[#b9aea0]">{item.label}</span>
                      <span className="mt-1 block truncate text-base font-bold text-[#f4eee4] sm:text-lg">{item.value}</span>
                    </span>
                  </span>
                  <span className="text-[34px] font-extrabold leading-none text-[#d6a15f] transition group-hover:translate-x-2">→</span>
                </motion.a>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 36, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.65, delay: 0.12 }}
            className="contacts-map relative min-h-[520px] overflow-hidden rounded-lg border border-[#d6a15f]/15 bg-[#12100d] shadow-[0_28px_90px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(214,161,95,0.08)] lg:min-h-[650px]"
          >
            <iframe
              src="https://yandex.ru/map-widget/v1/?ll=131.848450%2C43.087200&z=17&l=map&pt=131.848564%2C43.087560%2Cpm2rdm"
              title="Баня Море на карте"
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              allowFullScreen
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
