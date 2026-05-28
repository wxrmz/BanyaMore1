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

export default function Gallery() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-120px' });
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<number | null>(null);
  const visible = useMemo(() => gallery.filter((item) => filter === 'all' || item.category === filter), [filter]);
  const selectedImage = selected === null ? null : visible[selected];

  const shift = (direction: -1 | 1) => {
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
              <div className="eyebrow">Галерея</div>
              <h2 className="section-title mt-5 max-w-4xl">Фотографии без ровной сетки — как живой альбом места.</h2>
            </motion.div>

            <motion.div
              initial={{ y: 22, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="flex flex-wrap gap-2 rounded-lg bg-[#21170f]/55 p-2 shadow-[inset_0_1px_0_rgba(214,161,95,0.10)]"
            >
              {categories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setFilter(item.id);
                    setSelected(null);
                  }}
                  className={`rounded-md px-4 py-2 text-sm font-bold transition ${
                    filter === item.id ? 'bg-[#d6a15f] text-[#15110d]' : 'text-[#d8d0c4] hover:bg-[#d6a15f]/10'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </motion.div>
          </div>

          <motion.div layout className="columns-1 gap-4 md:columns-2 xl:columns-3">
            <AnimatePresence mode="popLayout">
              {visible.map((image, index) => (
                <motion.button
                  layout
                  key={image.src}
                  type="button"
                  initial={{ y: 34, opacity: 0, scale: 0.98 }}
                  animate={isInView ? { y: 0, opacity: 1, scale: 1 } : {}}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.42, delay: index * 0.04 }}
                  onClick={() => setSelected(index)}
                  className={`group image-sheen mb-4 block w-full break-inside-avoid overflow-hidden rounded-lg bg-[#15110d] text-left shadow-[0_20px_70px_rgba(0,0,0,0.24)] ${image.height}`}
                >
                  <span className="relative block h-full w-full">
                    <img src={image.src} alt={image.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    <span className="absolute inset-0 bg-gradient-to-t from-[#090806]/92 via-[#090806]/14 to-transparent opacity-90" />
                    <span className="absolute left-4 top-4 rounded-full bg-[#090806]/62 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#d6a15f] backdrop-blur-md">
                      {categories.find((item) => item.id === image.category)?.name}
                    </span>
                    <span className="absolute bottom-4 left-4 right-4">
                      <span className="block font-sans text-2xl font-extrabold leading-tight text-[#f4eee4]">{image.title}</span>
                      <span className="mt-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#d6a15f]">
                        Смотреть фото <span className="transition group-hover:translate-x-1">→</span>
                      </span>
                    </span>
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
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
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-lg border border-[#d6a15f]/25 bg-[#21170f]/55 text-xl text-[#f4eee4]"
              aria-label="Закрыть галерею"
            >
              ×
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                shift(-1);
              }}
              className="absolute left-5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg border border-[#d6a15f]/25 bg-[#21170f]/55 text-2xl text-[#f4eee4]"
              aria-label="Предыдущее фото"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                shift(1);
              }}
              className="absolute right-5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg border border-[#d6a15f]/25 bg-[#21170f]/55 text-2xl text-[#f4eee4]"
              aria-label="Следующее фото"
            >
              ›
            </button>

            <motion.figure
              initial={{ y: 30, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 30, scale: 0.96, opacity: 0 }}
              className="max-h-[86vh] max-w-6xl"
              onClick={(event) => event.stopPropagation()}
            >
              <img src={selectedImage.src} alt={selectedImage.title} className="max-h-[78vh] w-full rounded-lg object-contain" />
              <figcaption className="mt-4 text-center text-sm font-bold text-[#f4eee4]">{selectedImage.title}</figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
