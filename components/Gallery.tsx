'use client';

import { AnimatePresence, motion, useInView } from 'framer-motion';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

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
  const categoryBarRef = useRef<HTMLDivElement | null>(null);
  const categoryRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isInView = useInView(ref, { once: true, margin: '-120px' });
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<0 | -1 | 1>(0);
  const [categoryPill, setCategoryPill] = useState<{ height: number; left: number; top: number; width: number } | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const visible = useMemo(() => gallery.filter((item) => filter === 'all' || item.category === filter), [filter]);
  const displayed = useMemo(() => visible.slice(0, visibleCount), [visible, visibleCount]);
  const canShowMore = visibleCount < visible.length;
  const selectedImage = selected === null ? null : visible[selected];

  const shift = (direction: -1 | 1) => {
    setSlideDirection(direction);
    setSelected((current) => {
      if (current === null) return current;
      return (current + direction + visible.length) % visible.length;
    });
  };

  useLayoutEffect(() => {
    setVisibleCount(6);
  }, [filter]);

  useLayoutEffect(() => {
    const updatePill = () => {
      const bar = categoryBarRef.current;
      const activeButton = categoryRefs.current[filter];

      if (!bar || !activeButton) {
        return;
      }

      const barRect = bar.getBoundingClientRect();
      const activeRect = activeButton.getBoundingClientRect();

      setCategoryPill({
        height: activeRect.height,
        left: activeRect.left - barRect.left,
        top: activeRect.top - barRect.top,
        width: activeRect.width,
      });
    };

    updatePill();
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [filter]);

  return (
    <>
      <section id="gallery" className="gallery-section layer-card section scroll-mt-20 bg-[#090806]" ref={ref}>
        <div className="container-custom">
          <div className="mb-10 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.62 }}
            >
              <div className="eyebrow text-[22px] sm:text-[24px] lg:text-[26px]">Галерея</div>
              <h2 className="section-title mt-5 max-w-4xl">Фотографии без ровной сетки — как живой альбом места</h2>
            </motion.div>

            <motion.div
              initial={{ y: 22, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.12 }}
              ref={categoryBarRef}
              className="relative mx-auto flex min-h-[60px] w-fit flex-wrap items-center justify-center gap-2 rounded-2xl border border-[#d6a15f]/20 bg-[#21170f]/70 p-1.5 shadow-[inset_0_1px_0_rgba(214,161,95,0.14),0_18px_55px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:min-h-[64px] lg:mx-0 lg:w-auto lg:justify-start"
            >
              {categoryPill && (
                <motion.span
                  aria-hidden="true"
                  initial={false}
                  animate={{
                    height: categoryPill.height,
                    width: categoryPill.width,
                    x: categoryPill.left,
                    y: categoryPill.top,
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute left-0 top-0 z-0 rounded-xl border border-[#d6a15f]/55 bg-[#d6a15f] shadow-[0_12px_28px_rgba(214,161,95,0.22)]"
                />
              )}
              {categories.map((item) => (
                <motion.button
                  key={item.id}
                  ref={(node) => {
                    categoryRefs.current[item.id] = node;
                  }}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setFilter(item.id);
                    setSelected(null);
                  }}
                  aria-pressed={filter === item.id}
                  className={`relative z-10 h-12 min-w-[80px] rounded-xl px-3 text-[18px] font-extrabold transition-colors sm:h-13 sm:min-w-[92px] sm:px-4 sm:text-[21px] ${
                    filter === item.id ? 'text-[#15110d]' : 'text-[#d8d0c4] hover:text-[#f3d09b]'
                  }`}
                >
                  {item.name}
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
              {displayed.map((image, index) => (
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
                  className={`group mb-4 block w-full break-inside-avoid rounded-2xl bg-[#15110d] text-left shadow-[0_20px_70px_rgba(0,0,0,0.24)] ${image.height}`}
                >
                  <span className="relative block h-full w-full overflow-hidden rounded-2xl">
                    <img src={image.src} alt={image.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    <span className="absolute inset-x-0 bottom-0 h-[40%] bg-[linear-gradient(180deg,transparent_0%,rgba(9,8,6,0.32)_42%,rgba(9,8,6,0.9)_100%)]" />
                    <span className="absolute bottom-5 left-5 right-5">
                      <span className="block font-sans text-[27px] font-extrabold leading-tight text-[#f4eee4] sm:text-[30px]">{image.title}</span>
                      <span className="gallery-photo-cta mt-3 inline-flex h-7 items-center text-[16px] font-extrabold uppercase tracking-[0.15em] sm:text-[18px]">
                        Смотреть фото
                        <span className="relative ml-2.5 inline-block h-5 w-9 shrink-0 overflow-visible">
                          <span className="absolute left-0 top-[calc(50%-2px)] text-[40px] font-extrabold leading-none -translate-y-1/2">→</span>
                        </span>
                      </span>
                    </span>
                  </span>
                </motion.button>
              ))}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {canShowMore && (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8 flex justify-center sm:mt-10"
              >
                <motion.button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + 6)}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                  className="group inline-flex h-16 items-center rounded-2xl border border-[#d6a15f]/55 bg-[#d6a15f] px-8 text-[21px] font-extrabold text-[#15110d] shadow-[0_16px_38px_rgba(214,161,95,0.26)] transition-colors hover:bg-[#e3ac68] sm:h-20 sm:px-10 sm:text-[27px]"
                >
                  Показать ещё
                  <span className="relative ml-3 inline-block h-8 w-8 overflow-visible transition-transform duration-300 group-hover:translate-y-0.5 sm:h-9 sm:w-9">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </motion.button>
              </motion.div>
            )}
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
