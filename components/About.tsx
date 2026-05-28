'use client';

import { AnimatePresence, motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const stories = [
  {
    number: '01',
    title: 'Приезд',
    text: 'Приезжайте к берегу и оставьте лишнее позади.',
    image: '/images/20250721_204935.jpg',
  },
  {
    number: '02',
    title: 'Пар',
    text: 'Честный жар и аромат дерева наполняют тело легкостью.',
    image: '/images/20211117_183306.jpg',
  },
  {
    number: '03',
    title: 'Терраса',
    text: 'Выйдите, подышите, остыньте чаем и наслаждайтесь моментом.',
    image: '/images/20240502_210421.jpg',
  },
  {
    number: '04',
    title: 'Море',
    text: 'Ощущайте ветер и вид на горизонт рядом с парной.',
    image: '/images/20210509_200041.jpg',
  },
  {
    number: '05',
    title: 'Отдых',
    text: 'Оставайтесь подольше и не торопитесь обратно.',
    image: '/images/photo-10.jpg',
  },
];

export default function About() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-120px' });
  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);

  const shift = (direction: -1 | 1) => {
    setActive((value) => (value + direction + stories.length) % stories.length);
  };

  useEffect(() => {
    if (viewer !== null) {
      return;
    }

    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % stories.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [viewer]);

  return (
    <>
      <section
        id="about"
        className="about-section relative overflow-hidden bg-[#050403] pb-16 pt-14 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20"
        ref={ref}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_22%,rgba(214,161,95,0.10),transparent_34rem)]" />

        <motion.div
          initial={{ y: 34, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.68, ease: 'easeOut' }}
          className="relative mx-auto w-[calc(100%-24px)] overflow-hidden rounded-lg bg-transparent px-5 py-8 sm:w-[calc(100%-48px)] sm:px-8 sm:py-10 lg:w-[calc(100%-64px)] lg:px-12 lg:py-12 2xl:w-[calc(100%-88px)]"
        >
          <div className="grid gap-10 xl:grid-cols-[minmax(320px,0.3fr)_minmax(0,1fr)] xl:items-center">
            <div className="max-w-md xl:-translate-y-8 xl:max-w-[360px] 2xl:-translate-y-12">
              <div className="eyebrow">О нас</div>
              <h2 className="mt-6 font-serif text-[clamp(3.05rem,4.45vw,5.05rem)] font-semibold leading-[0.94] text-[#f4eee4]">
                История
                <br />
                одного
                <br />
                места
              </h2>
              <p className="mt-7 max-w-[360px] text-[1.18rem] font-semibold leading-9 text-[#b9aea0]">
                Баня Море - это про простые вещи, которые возвращают силы: теплое дерево, пар на дровах и море в двух шагах.
              </p>
              <a
                href="#baths"
                className="mt-10 inline-flex items-center gap-6 text-[16px] font-extrabold uppercase tracking-[0.24em] text-[#d6a15f] transition hover:text-[#f3d09b]"
              >
                Наша философия <span className="text-3xl leading-none" aria-hidden="true">→</span>
              </a>
            </div>

            <div>
              <div className="flex gap-3 overflow-x-auto pb-2 md:overflow-visible md:pb-0">
                {stories.map((story, index) => {
                  const isActive = active === index;

                  return (
                    <button
                      key={story.number}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          setViewer(index);
                          return;
                        }
                        setActive(index);
                      }}
                      className={`about-carousel-card group relative min-h-[400px] overflow-hidden rounded-lg border text-left sm:min-h-[470px] md:min-h-[545px] xl:min-h-[590px] ${
                        isActive
                          ? 'is-active border-[#d6a15f]/85 shadow-[0_0_0_1px_rgba(214,161,95,0.18),0_24px_80px_rgba(0,0,0,0.34)]'
                          : 'border-[#6b4523]/55 shadow-[0_18px_60px_rgba(0,0,0,0.22)] hover:border-[#9b6532]/80'
                      }`}
                    >
                      <img
                        src={story.image}
                        alt={story.title}
                        className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${
                          isActive ? 'scale-105 opacity-72' : 'opacity-42 grayscale-[0.12] group-hover:scale-105 group-hover:opacity-58'
                        }`}
                      />
                      <div
                        className={`absolute inset-0 transition duration-500 ${
                          isActive
                            ? 'bg-[linear-gradient(180deg,rgba(5,4,3,0.26)_0%,rgba(5,4,3,0.46)_44%,rgba(5,4,3,0.94)_100%)]'
                            : 'bg-[linear-gradient(180deg,rgba(5,4,3,0.58)_0%,rgba(5,4,3,0.72)_50%,rgba(5,4,3,0.97)_100%)]'
                        }`}
                      />
                      <div className="relative flex h-full min-h-[400px] flex-col justify-between p-5 sm:min-h-[470px] md:min-h-[545px] xl:min-h-[590px]">
                        <div className="h-8" aria-hidden="true" />
                        <div
                          className={`w-[172px] overflow-hidden transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] xl:w-[196px] ${
                            isActive ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-90 group-hover:opacity-100'
                          }`}
                        >
                          <h3 className="font-sans text-[1.7rem] font-extrabold leading-tight text-[#f4eee4]">{story.title}</h3>
                          <p className="mt-4 text-lg font-semibold leading-8 text-[#c8bfb4]">{story.text}</p>
                          <span
                            className={`mt-5 inline-flex text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#d6a15f] transition-[opacity,transform] duration-500 ease-out ${
                              isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                            }`}
                          >
                            Нажмите еще раз
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-10 flex items-center justify-center gap-10">
                <button
                  type="button"
                  onClick={() => shift(-1)}
                  className="text-2xl text-[#8f857a] transition hover:text-[#d6a15f]"
                  aria-label="Предыдущий шаг"
                >
                  ←
                </button>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-extrabold leading-none text-[#d6a15f]">{stories[active].number}</span>
                  <div className="flex w-80 items-center gap-3">
                    {stories.map((story, index) => (
                      <button
                        key={story.number}
                        type="button"
                        onClick={() => setActive(index)}
                        className={`h-[2px] flex-1 transition ${active === index ? 'bg-[#d6a15f]' : 'bg-[#3a3026] hover:bg-[#d6a15f]/45'}`}
                        aria-label={`Перейти к шагу ${story.number}`}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => shift(1)}
                  className="text-2xl text-[#8f857a] transition hover:text-[#d6a15f]"
                  aria-label="Следующий шаг"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <AnimatePresence>
        {viewer !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            onClick={() => setViewer(null)}
          >
            <button
              type="button"
              onClick={() => setViewer(null)}
              className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-lg border border-[#6b4523]/70 bg-[#21170f]/70 text-xl text-[#f4eee4]"
              aria-label="Закрыть изображение"
            >
              ×
            </button>
            <motion.figure
              initial={{ y: 28, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 28, scale: 0.96, opacity: 0 }}
              className="max-h-[86vh] max-w-6xl"
              onClick={(event) => event.stopPropagation()}
            >
              <img src={stories[viewer].image} alt={stories[viewer].title} className="max-h-[78vh] w-full rounded-lg object-contain" />
              <figcaption className="mt-4 text-center text-sm font-bold text-[#f4eee4]">{stories[viewer].title}</figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
