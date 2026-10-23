'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ArrowIcon } from './ArrowIcon';
import { useCloseOnBack } from '@/lib/useCloseOnBack';
import { lightboxFigureTransition } from '@/lib/lightboxMotion';

// Меню и услуги открываются на сайте как фотографии в галерее, а не PDF
// в новой вкладке. Страницы — картинки, снятые с PDF из /public/documents.
export type SiteDocument = {
  title: string;
  pages: string[];
};

const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 40 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -40 }),
};

export default function DocumentLightbox({ document: doc, onClose }: { document: SiteDocument | null; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const pageCount = doc?.pages.length ?? 0;

  useCloseOnBack(doc !== null, onClose);

  useEffect(() => {
    setPage(0);
  }, [doc]);

  const shift = (step: number) => {
    if (pageCount < 2) return;
    setDirection(step);
    setPage((current) => (current + step + pageCount) % pageCount);
  };

  useEffect(() => {
    if (!doc) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') shift(1);
      if (event.key === 'ArrowLeft') shift(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <AnimatePresence>
      {doc && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="gallery-lightbox document-lightbox fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={doc.title}
        >
          <motion.figure
            initial={{ y: 30, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.96, opacity: 0 }}
            transition={lightboxFigureTransition}
            className="gallery-lightbox__figure relative flex max-h-[92vh] w-full max-w-6xl flex-col items-center"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="gallery-lightbox__media relative inline-flex max-h-[82vh] max-w-full items-center justify-center">
              <div className="gallery-lightbox__frame overflow-hidden rounded-2xl">
                <AnimatePresence initial={false} mode="wait" custom={direction}>
                  <motion.img
                    key={doc.pages[page]}
                    src={doc.pages[page]}
                    decoding="async"
                    alt={pageCount > 1 ? `${doc.title}, страница ${page + 1}` : doc.title}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="document-lightbox__image block h-auto max-h-[78vh] w-auto max-w-[calc(100vw-32px)] rounded-2xl"
                  />
                </AnimatePresence>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="gallery-lightbox__close absolute right-3 top-3 grid h-12 w-12 place-items-center rounded-lg border border-[#d6a15f]/35 bg-[#21170f]/75 font-bold leading-none text-[#f4eee4] shadow-[0_16px_40px_rgba(0,0,0,0.34)] transition hover:border-[#d6a15f]/80 hover:bg-[#d6a15f] hover:text-[#15110d] sm:-right-16 sm:top-0 sm:h-14 sm:w-14"
                aria-label={`Закрыть: ${doc.title}`}
              >
                <span className="block translate-y-[-1px] text-[36px] leading-none">×</span>
              </button>
              {pageCount > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => shift(-1)}
                    className="gallery-lightbox__arrow gallery-lightbox__arrow--prev absolute left-3 top-1/2 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-xl border border-[#d6a15f]/35 bg-[#21170f]/75 text-5xl font-bold leading-none text-[#f4eee4] shadow-[0_18px_45px_rgba(0,0,0,0.36)] transition hover:border-[#d6a15f]/80 hover:bg-[#d6a15f] hover:text-[#15110d] sm:-left-20 sm:h-16 sm:w-16"
                    aria-label="Предыдущая страница"
                  >
                    <ArrowIcon className="h-[60px] w-[60px] -translate-y-[2px]" direction="left" />
                  </button>
                  <button
                    type="button"
                    onClick={() => shift(1)}
                    className="gallery-lightbox__arrow gallery-lightbox__arrow--next absolute right-3 top-1/2 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-xl border border-[#d6a15f]/35 bg-[#21170f]/75 text-5xl font-bold leading-none text-[#f4eee4] shadow-[0_18px_45px_rgba(0,0,0,0.36)] transition hover:border-[#d6a15f]/80 hover:bg-[#d6a15f] hover:text-[#15110d] sm:-right-20 sm:h-16 sm:w-16"
                    aria-label="Следующая страница"
                  >
                    <ArrowIcon className="h-[60px] w-[60px] -translate-y-[2px]" />
                  </button>
                </>
              )}
            </div>
            {pageCount > 1 && (
              <figcaption className="document-lightbox__counter mt-4 text-[15px] font-bold tracking-[0.12em] text-[#d8d0c4]">
                {page + 1} / {pageCount}
              </figcaption>
            )}
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
