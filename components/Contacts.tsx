'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const contacts = [
  { label: 'Телефон', value: '+7 908 440 20 55', href: 'tel:+79084402055' },
  { label: 'Telegram', value: '@Banyam0rerf', href: 'https://t.me/Banyam0rerf' },
  { label: 'Instagram', value: '@banya_more', href: 'https://www.instagram.com/banya_more?igsh=dm50NnV5cW5neGJy' },
  { label: 'Email', value: 'banyan.more.rf@gmail.com', href: 'mailto:banyan.more.rf@gmail.com' },
];

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
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[#b9aea0]">{item.label}</span>
                    <span className="mt-1 block text-base font-bold text-[#f4eee4] sm:text-lg">{item.value}</span>
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
