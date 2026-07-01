'use client';

import { AnimatePresence, motion, useInView } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';

const categories = [
  { id: 'all', name: 'Все' },
  { id: 'sea', name: 'Море' },
  { id: 'interior', name: 'Интерьер' },
  { id: 'steam', name: 'Парная' },
  { id: 'outside', name: 'Снаружи' },
];

const gallery = [
  { src: '/images/20250721_204935.jpg', title: 'Домики у заката', category: 'outside', height: 'h-[520px]' },
  { src: '/images/photo-1.jpg', title: 'Комната отдыха', category: 'interior', height: 'h-[280px]' },
  { src: '/images/20211117_183306.jpg', title: 'Парная на дровах', category: 'steam', height: 'h-[360px]' },
  { src: '/images/20210509_200041.jpg', title: 'Воздух у воды', category: 'sea', height: 'h-[430px]' },
  { src: '/images/20201018182427_IMG_8862.JPG', title: 'Вечерний берег', category: 'sea', height: 'h-[300px]' },
  { src: '/images/20240502_210421.jpg', title: 'Терраса', category: 'outside', height: 'h-[390px]' },
  { src: '/images/photo-22.jpg', title: 'Дерево и тепло', category: 'interior', height: 'h-[310px]' },
  { src: '/images/photo-10.jpg', title: 'Большая баня', category: 'outside', height: 'h-[460px]' },
];

const imageSlideVariants = {
  enter: (direction: 0 | -1 | 1) => ({
    opacity: 0,
    x: direction === 0 ? 0 : direction * 52,
    scale: 0.985,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  exit: (direction: 0 | -1 | 1) => ({
    opacity: 0,
    x: direction === 0 ? 0 : direction * -52,
    scale: 0.985,
  }),
};

export default function Gallery() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-120px' });
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<0 | -1 | 1>(0);
  const visible = useMemo(() => gallery.filter((item) => filter === 'all' || item.category === filter), [filter]);
  const selectedImage = selected === null ? null : visible[selected];

  const shift = (direction: -1 | 1) => {
    setSlideDirection(direction);
    setSelected((current) => {
      if (current === null) return current;
      return (current + direction + visible.length) % visible.length;
    });
  };

  return (
    <>
      <section id="gallery" className="gallery-section section scroll-mt-20 bg-[#090806]" ref={ref}>
        <div className="container-custom">
          <div className="mb-10 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.62 }}
            >
              <div className="eyebrow text-[22px] sm:text-[24px] lg:text-[26px]">Галерея</div>
              <h2 className="section-title mt-5 max-w-4xl">Фотографии без ровной сетки — как живой альбом места.</h2>
            </motion.div>

            <motion.div
              initial={{ y: 22, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.12 }}
            className="flex min-h-[56px] flex-wrap items-center gap-1.5 rounded-2xl border border-[#d6a15f]/20 bg-[#21170f]/70 p-1 shadow-[inset_0_1px_0_rgba(214,161,95,0.14),0_18px_55px_rgba(0,0,0,0.26)] backdrop-blur-xl"
            >
              {categories.map((item) => (
                <motion.button
                  key={item.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setFilter(item.id);
                    setSelected(null);
                  }}
                  aria-pressed={filter === item.id}
                className={`relative h-11 min-w-[82px] overflow-hidden rounded-xl px-3 text-[17px] font-extrabold transition-colors ${
                    filter === item.id ? 'text-[#15110d]' : 'text-[#d8d0c4] hover:text-[#f3d09b]'
                  }`}
                >
                  {filter === item.id && (
                    <motion.span
                      layoutId="gallery-active-category"
                      className="absolute inset-0 rounded-xl border border-[#d6a15f]/55 bg-[#d6a15f] shadow-[0_12px_28px_rgba(214,161,95,0.22)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10">{item.name}</span>
                </motion.button>
              ))}
            </motion.div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.34, ease: 'easeOut' }}
              className="columns-1 gap-4 md:columns-2 xl:columns-3"
            >
              {visible.map((image, index) => (
                <motion.button
                  key={image.src}
                  type="button"
                  initial={{ y: 22, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  onClick={() => {
                    setSlideDirection(0);
                    setSelected(index);
                  }}
                  className={`group mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-[#15110d] text-left shadow-[0_20px_70px_rgba(0,0,0,0.24)] ${image.height}`}
                >
                  <span className="relative block h-full w-full">
                    <img src={image.src} alt={image.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    <span className="absolute inset-x-0 bottom-0 h-[40%] bg-[linear-gradient(180deg,transparent_0%,rgba(9,8,6,0.32)_42%,rgba(9,8,6,0.9)_100%)]" />
                    <span className="absolute bottom-5 left-5 right-5">
                      <span className="block font-sans text-[25px] font-extrabold leading-tight text-[#f4eee4] sm:text-[27px]">{image.title}</span>
                      <span className="mt-2.5 inline-flex h-5 items-center text-[13.5px] font-bold uppercase tracking-[0.14em] text-[#d6a15f] sm:text-[14.5px]">
                        Смотреть фото
                        <span className="relative ml-2 inline-block h-5 w-8 shrink-0 overflow-visible">
                          <span className="absolute left-0 top-[calc(50%-2px)] text-[36px] font-extrabold leading-none -translate-y-1/2">→</span>
                        </span>
                      </span>
                    </span>
                  </span>
                </motion.button>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            onClick={() => setSelected(null)}
          >
            <motion.figure
              initial={{ y: 30, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 30, scale: 0.96, opacity: 0 }}
              className="relative flex max-h-[92vh] w-full max-w-6xl flex-col items-center"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative inline-flex max-h-[82vh] max-w-full items-center justify-center">
                <div className="overflow-hidden rounded-2xl">
                  <AnimatePresence initial={false} mode="wait" custom={slideDirection}>
                    <motion.img
                      key={selectedImage.src}
                      src={selectedImage.src}
                      alt={selectedImage.title}
                      custom={slideDirection}
                      variants={imageSlideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="max-h-[78vh] w-full rounded-2xl object-contain"
                    />
                  </AnimatePresence>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="absolute right-3 top-3 grid h-12 w-12 place-items-center rounded-lg border border-[#d6a15f]/35 bg-[#21170f]/75 font-bold leading-none text-[#f4eee4] shadow-[0_16px_40px_rgba(0,0,0,0.34)] transition hover:border-[#d6a15f]/80 hover:bg-[#d6a15f] hover:text-[#15110d] sm:-right-16 sm:top-0 sm:h-14 sm:w-14"
                  aria-label="Закрыть галерею"
                >
                  <span className="block translate-y-[-1px] text-[36px] leading-none">×</span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    shift(-1);
                  }}
                  className="absolute left-3 top-1/2 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-xl border border-[#d6a15f]/35 bg-[#21170f]/75 text-5xl font-bold leading-none text-[#f4eee4] shadow-[0_18px_45px_rgba(0,0,0,0.36)] transition hover:border-[#d6a15f]/80 hover:bg-[#d6a15f] hover:text-[#15110d] sm:-left-20 sm:h-16 sm:w-16"
                  aria-label="Предыдущее фото"
                >
                  <span className="block translate-y-[-2px] leading-none">‹</span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    shift(1);
                  }}
                  className="absolute right-3 top-1/2 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-xl border border-[#d6a15f]/35 bg-[#21170f]/75 text-5xl font-bold leading-none text-[#f4eee4] shadow-[0_18px_45px_rgba(0,0,0,0.36)] transition hover:border-[#d6a15f]/80 hover:bg-[#d6a15f] hover:text-[#15110d] sm:-right-20 sm:h-16 sm:w-16"
                  aria-label="Следующее фото"
                >
                  <span className="block translate-y-[-2px] leading-none">›</span>
                </button>
              </div>
              <figcaption className="mt-5 text-center font-sans text-[clamp(1.3rem,1.85vw,2.2rem)] font-extrabold leading-tight text-[#f4eee4]">{selectedImage.title}</figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
