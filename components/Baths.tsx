'use client';

import { AnimatePresence, motion, useInView } from 'framer-motion';
import type { PointerEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

const PeopleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const baths = [
  {
    name: 'Малые бани',
    capacity: '1-4 человека',
    price: '2 500 ₽/ч',
    image: '/images/photo-5.jpg',
    gallery: ['/images/photo-5.jpg', '/images/photo-1.jpg', '/images/20240502_210421.jpg'],
    lead: 'Камерные бани для пары или небольшой компании.',
    text: 'Уютная парная, отдельная зона отдыха и спокойный вечер у моря без лишней суеты.',
    details: ['Дровяная печь', 'Отдельная терраса', 'Чайная зона', 'Тихий отдых'],
  },
  {
    name: 'Средние бани',
    capacity: '1-6 человек',
    price: '2 800 ₽/ч',
    image: '/images/photo-22.jpg',
    gallery: ['/images/photo-22.jpg', '/images/20211117_183306.jpg', '/images/20210509_200041.jpg'],
    lead: 'Удобные бани для компании у моря.',
    text: 'Два уровня для отдыха, просторная парная и отдельные зоны, чтобы удобно провести вечер семьей или компанией друзей.',
    details: ['Два этажа', 'Просторная парная', 'Вид на море', 'Для компании'],
  },
  {
    name: 'Большие бани',
    capacity: '1-8 человек',
    price: '3 000 ₽/ч',
    image: '/images/photo-10.jpg',
    gallery: ['/images/photo-10.jpg', '/images/20250721_204935.jpg', '/images/20201018182427_IMG_8862.JPG'],
    lead: 'Просторные бани для свободного отдыха.',
    text: 'Много воздуха, широкая зона отдыха и комфортный общий стол для длинного вечера после парной.',
    details: ['Очень просторно', 'Большая терраса', 'Мини-кухня', 'Для компании'],
  },
];

const wrapIndex = (value: number) => (value + baths.length) % baths.length;

export default function Baths() {
  const ref = useRef(null);
  const mobileBathRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mobileBathListRef = useRef<HTMLDivElement | null>(null);
  const mobileScrollTimer = useRef<number | null>(null);
  const mobileDrag = useRef({
    hasDragged: false,
    isDragging: false,
    startScrollLeft: 0,
    startX: 0,
  });
  const isInView = useInView(ref, { once: true, margin: '-120px' });
  const [active, setActive] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [prevGalleryIndex, setPrevGalleryIndex] = useState<number | null>(null);
  const [isGalleryFading, setIsGalleryFading] = useState(false);
  const galleryFadeTimer = useRef<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const shift = (direction: -1 | 1) => {
    setActive((value) => wrapIndex(value + direction));
  };

  const selectMobileBath = (index: number) => {
    setActive(Math.max(0, Math.min(baths.length - 1, index)));
  };

  const shiftMobileBath = (direction: -1 | 1) => {
    setActive((value) => Math.max(0, Math.min(baths.length - 1, value + direction)));
  };

  const centerMobileBath = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const list = mobileBathListRef.current;
    const item = mobileBathRefs.current[index];

    if (!list || !item) {
      return;
    }

    const pageLeft = window.scrollX;
    const pageTop = window.scrollY;
    const restorePagePosition = () => {
      window.scrollTo({ behavior: 'auto', left: pageLeft, top: pageTop });
    };

    list.scrollTo({
      behavior,
      left: item.offsetLeft - (list.clientWidth - item.clientWidth) / 2,
    });

    window.requestAnimationFrame(restorePagePosition);

    if (behavior === 'smooth') {
      window.setTimeout(restorePagePosition, 260);
    }
  };

  const selectNearestMobileBath = () => {
    const list = mobileBathListRef.current;

    if (!list) {
      return;
    }

    const listCenter = list.getBoundingClientRect().left + list.clientWidth / 2;
    const nearest = mobileBathRefs.current.reduce(
      (closest, node, index) => {
        if (!node) {
          return closest;
        }

        const rect = node.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - listCenter);
        return distance < closest.distance ? { distance, index } : closest;
      },
      { distance: Number.POSITIVE_INFINITY, index: active },
    );

    setActive(nearest.index);
  };

  const handleMobileBathScroll = () => {
    if (mobileScrollTimer.current) {
      window.clearTimeout(mobileScrollTimer.current);
    }

    mobileScrollTimer.current = window.setTimeout(selectNearestMobileBath, 90);
  };

  const handleMobileBathPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const list = mobileBathListRef.current;

    if (!list) {
      return;
    }

    mobileDrag.current = {
      hasDragged: false,
      isDragging: true,
      startScrollLeft: list.scrollLeft,
      startX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleMobileBathPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const list = mobileBathListRef.current;

    if (!list || !mobileDrag.current.isDragging) {
      return;
    }

    const deltaX = event.clientX - mobileDrag.current.startX;

    if (Math.abs(deltaX) > 4) {
      mobileDrag.current.hasDragged = true;
    }

    if (mobileDrag.current.hasDragged) {
      list.scrollLeft = mobileDrag.current.startScrollLeft - deltaX;
      event.preventDefault();
    }
  };

  const finishMobileBathDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!mobileDrag.current.isDragging) {
      return;
    }

    mobileDrag.current.isDragging = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    window.setTimeout(selectNearestMobileBath, 0);
  };

  const handleMobileBathClick = (index: number, isActive: boolean) => {
    if (mobileDrag.current.hasDragged) {
      window.setTimeout(() => {
        mobileDrag.current.hasDragged = false;
      }, 0);
      return;
    }

    if (isActive) {
      openBath(index);
      return;
    }

    selectMobileBath(index);
  };

  useEffect(() => {
    return () => {
      if (mobileScrollTimer.current) {
        window.clearTimeout(mobileScrollTimer.current);
      }
      if (galleryFadeTimer.current) {
        window.clearTimeout(galleryFadeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (window.innerWidth > 1023 || expanded !== null) {
      return;
    }

    centerMobileBath(active);
  }, [active, expanded]);

  const openBath = (index: number) => {
    setGalleryIndex(0);
    setIsClosing(false);
    setActive(index);
    setExpanded(index);
  };

  const closeBath = () => {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(() => {
      setExpanded(null);
      setIsClosing(false);
      setGalleryIndex(0);
      setPrevGalleryIndex(null);
      setIsGalleryFading(false);
    }, 320);
  };

  const switchGallery = (nextIndex: number) => {
    if (nextIndex === galleryIndex) {
      return;
    }

    if (galleryFadeTimer.current) {
      window.clearTimeout(galleryFadeTimer.current);
    }

    setPrevGalleryIndex(galleryIndex);
    setGalleryIndex(nextIndex);
    setIsGalleryFading(true);
    galleryFadeTimer.current = window.setTimeout(() => {
      setIsGalleryFading(false);
      setPrevGalleryIndex(null);
    }, 360);
  };

  const scrollToSchedule = () => {
    const target = document.querySelector('#schedule');
    if (!target) {
      return;
    }

    const top = target.getBoundingClientRect().top + window.scrollY - 76 + 52;
    window.scrollTo({ top, behavior: 'smooth' });
  };



  const sliderClassName = [
    'baths-showcase__slider',
    `baths-showcase__slider--active-${active}`,
    expanded !== null ? (isClosing ? 'is-returning' : 'is-under-expanded') : '',
  ]
    .filter(Boolean)
    .join(' ');
  const expandedBath = expanded === null ? null : baths[expanded];
  const selectedBath = expandedBath ?? baths[active];

  const slider = (
    <div className={sliderClassName}>
      {baths.map((bath, index) => {
        const isActive = index === active;
        const positionClass = index === 0 ? 'is-left' : index === 2 ? 'is-right' : 'is-center';

        return (
          <button
            key={bath.name}
            type="button"
            onClick={() => {
              if (isActive) {
                openBath(index);
                return;
              }
              selectMobileBath(index);
            }}
            className={`baths-showcase__card ${positionClass} ${isActive ? 'is-selected' : ''}`}
            aria-pressed={isActive}
          >
            <div className="baths-showcase__cardShell">
              <img src={bath.image} alt={bath.name} />
              <div className="baths-showcase__cardShade" />
              <div className="baths-showcase__cardInfo">
                <div>
                  <PeopleIcon className="baths-showcase__peopleIcon" />
                  {bath.capacity}
                </div>
                <h3>{bath.name}</h3>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={isActive ? 'open' : 'select'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="baths-showcase__cardAction"
                  >
                    {isActive ? 'Открыть раздел' : 'Выбрать'} <b aria-hidden="true">→</b>
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
            <div className="baths-showcase__cardTop">
              <strong>{bath.price}</strong>
            </div>
          </button>
        );
      })}

      <div className="baths-showcase__dots" aria-label="Выбор бани">
        {baths.map((bath, index) => (
          <button
            key={bath.name}
            type="button"
            onClick={() => selectMobileBath(index)}
            className={active === index ? 'is-active' : ''}
            aria-label={`Показать ${bath.name}`}
          />
        ))}
      </div>
    </div>
  );

  const mobileSlider = (
    <div
      ref={mobileBathListRef}
      className="baths-showcase__mobileList scrollbar-none"
      onScroll={handleMobileBathScroll}
      onPointerCancel={finishMobileBathDrag}
      onPointerDown={handleMobileBathPointerDown}
      onPointerLeave={finishMobileBathDrag}
      onPointerMove={handleMobileBathPointerMove}
      onPointerUp={finishMobileBathDrag}
      aria-label="Выбор бани"
    >
      {baths.map((bath, index) => {
        const isActive = active === index;

        return (
          <button
            key={bath.name}
            ref={(node) => {
              mobileBathRefs.current[index] = node;
            }}
            type="button"
            onClick={() => handleMobileBathClick(index, isActive)}
            className={`baths-showcase__mobileCard ${isActive ? 'is-selected' : ''}`}
            aria-pressed={isActive}
          >
            <img src={bath.image} alt={bath.name} />
            <div className="baths-showcase__cardShade" />
            <div className="baths-showcase__cardTop">
              <strong>{bath.price}</strong>
            </div>
            <div className="baths-showcase__cardInfo">
              <div>
                <PeopleIcon className="baths-showcase__peopleIcon" />
                {bath.capacity}
              </div>
              <h3>{bath.name}</h3>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isActive ? 'open' : 'select'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="baths-showcase__cardAction"
                >
                  {isActive ? 'Открыть раздел' : 'Выбрать'} <b aria-hidden="true">→</b>
                </motion.span>
              </AnimatePresence>
            </div>
          </button>
        );
      })}
    </div>
  );

  const mobileControls = (
    <div className="baths-showcase__mobileControls" aria-label="Mobile bath navigation">
      <div className="baths-showcase__mobileIndicator">
        <span>{String(active + 1).padStart(2, '0')}</span>
        <div className="baths-showcase__mobileDots" aria-label="Bath selection">
          {baths.map((bath, index) => (
            <button
              key={bath.name}
              type="button"
              onClick={() => selectMobileBath(index)}
              className={active === index ? 'is-active' : ''}
              aria-label={`Show bath ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <section id="baths" className="baths-showcase layer-card" ref={ref}>
      <div className="baths-showcase__glow" />

      <div className="baths-showcase__head container-custom">
        <motion.div
          initial={{ y: 34, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.62 }}
        >
          <div className="eyebrow text-[1.55rem] sm:text-[1.8rem] lg:text-[2rem]">Бани</div>
          <h2 className="section-title mt-5 max-w-4xl">Выберите свой формат у моря</h2>
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 34, opacity: 0 }}
        animate={isInView ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: 0.7, delay: 0.08, ease: 'easeOut' }}
        className="baths-showcase__stage"
      >
        {slider}
        {mobileSlider}
        {mobileControls}

        {expandedBath && (
          <div className={`baths-showcase__expanded ${isClosing ? 'is-closing' : 'is-opening'}`}>
            <div className="baths-showcase__morphPreview" aria-hidden="true">
                <img src={selectedBath.image} alt={selectedBath.name} />
                <div className="baths-showcase__cardShade" />
                <div className="baths-showcase__cardInfo">
                  <div>
                    <PeopleIcon className="baths-showcase__peopleIcon" />
                    {selectedBath.capacity}
                  </div>
                  <h3 className={expanded === 2 ? 'is-wide-name' : undefined}>{selectedBath.name}</h3>
                  <span>
                    Открыть раздел <b aria-hidden="true">→</b>
                  </span>
                </div>
                <div className="baths-showcase__cardTop">
                  <strong>{selectedBath.price}</strong>
                </div>
              </div>
            <div className="baths-showcase__expandedContent">
                <div className="baths-showcase__expandedMedia">
                  {isGalleryFading && prevGalleryIndex !== null && (
                    <img
                      key={selectedBath.gallery[prevGalleryIndex]}
                      src={selectedBath.gallery[prevGalleryIndex]}
                      alt={selectedBath.name}
                      className="baths-showcase__expandedImage is-fading-out"
                    />
                  )}
                  <img
                    key={selectedBath.gallery[galleryIndex]}
                    src={selectedBath.gallery[galleryIndex]}
                    alt={selectedBath.name}
                    className={`baths-showcase__expandedImage ${isGalleryFading ? 'is-fading-in' : ''}`}
                  />
                  <div className="baths-showcase__expandedShade" />
                  <button
                    type="button"
                    onClick={() => switchGallery((galleryIndex - 1 + selectedBath.gallery.length) % selectedBath.gallery.length)}
                    className="baths-showcase__expandedSide baths-showcase__expandedSide--left"
                    aria-label="Предыдущее фото"
                  />
                  <button
                    type="button"
                    onClick={() => switchGallery((galleryIndex + 1) % selectedBath.gallery.length)}
                    className="baths-showcase__expandedSide baths-showcase__expandedSide--right"
                    aria-label="Следующее фото"
                  />
                  <button
                    type="button"
                    onClick={() => switchGallery((galleryIndex - 1 + selectedBath.gallery.length) % selectedBath.gallery.length)}
                    className="baths-showcase__expandedArrow baths-showcase__expandedArrow--left"
                    aria-label="Предыдущее фото"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => switchGallery((galleryIndex + 1) % selectedBath.gallery.length)}
                    className="baths-showcase__expandedArrow baths-showcase__expandedArrow--right"
                    aria-label="Следующее фото"
                  >
                    →
                  </button>
                  <div className="baths-showcase__thumbs" aria-label="Фотографии бани">
                    {selectedBath.gallery.map((image, index) => (
                      <button
                        key={image}
                        type="button"
                        onClick={() => switchGallery(index)}
                        className={galleryIndex === index ? 'is-active' : ''}
                        aria-label={`Показать фото ${index + 1}`}
                      >
                        <img src={image} alt="" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="baths-showcase__expandedInfo">
                  <button type="button" onClick={closeBath} className="baths-showcase__back" disabled={isClosing}>
                    <span className="baths-showcase__backArrow">←</span>
                    <span>Вернуться</span>
                  </button>
                  <div className="eyebrow">
                    <PeopleIcon className="baths-showcase__peopleIcon" />
                    {selectedBath.capacity}
                  </div>
                  <h3 className={expanded === 2 ? 'is-wide-name' : undefined}>{selectedBath.name}</h3>
                  <p className="baths-showcase__description">{selectedBath.text}</p>

                  <div className="baths-showcase__actions">
                    <div className="baths-showcase__price">
                      <strong>{selectedBath.price}</strong>
                      <span>стоимость</span>
                    </div>
                    <a
                      href="#schedule"
                      onClick={(event) => {
                        event.preventDefault();
                        scrollToSchedule();
                      }}
                      className="btn-primary baths-showcase__bookButton"
                    >
                      Забронировать
                    </a>
                  </div>
                </div>
            </div>
          </div>
        )}
      </motion.div>
    </section>
  );
}
