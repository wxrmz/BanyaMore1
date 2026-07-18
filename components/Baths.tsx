'use client';

import { AnimatePresence, motion, useInView } from 'framer-motion';
import type { PointerEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ArrowIcon } from './ArrowIcon';
import { PeopleIcon } from './BathIcons';

const iconPaths = {
  towel: '/images/icons/polotenca.png?v=3',
  hat: '/images/icons/shapka.png?v=3',
  slippers: '/images/icons/tapochki.png?v=3',
  peoplePlus: '/images/icons/dop_chelovek.png?v=3',
  location: '/images/icons/metka.png?v=3',
};

type BathConfig = {
  name: string;
  capacity: string;
  price: string;
  image: string;
  gallery: string[];
  lead: string;
  text: string;
  details: string[];
  distance: string;
  extraPerson: string;
  included: { icon: 'towel' | 'hat' | 'slippers'; count: number }[];
  subBaths?: BathConfig[];
};

const baths: BathConfig[] = [
  {
    name: 'Малые бани',
    capacity: '1-4 человека',
    price: '2 500 ₽/ч',
    image: '/images/photo-5.jpg',
    gallery: ['/images/photo-5.jpg', '/images/photo-1.jpg', '/images/20240502_210421.jpg'],
    lead: 'Камерные бани для пары или небольшой компании.',
    text: 'Уютная парная, отдельная зона отдыха и спокойный вечер у моря без лишней суеты.',
    details: ['Дровяная печь', 'Отдельная терраса', 'Чайная зона', 'Тихий отдых'],
    distance: '20 метров от моря',
    extraPerson: '+ 400 ₽ доп. человек',
    included: [
      { icon: 'towel', count: 4 },
      { icon: 'hat', count: 4 },
      { icon: 'slippers', count: 4 },
    ],
    subBaths: [
      {
        name: 'Малая 1',
        capacity: '1-4 человека',
        price: '2 500 ₽/ч',
        image: '/images/photo-5.jpg',
        gallery: ['/images/photo-5.jpg', '/images/photo-1.jpg', '/images/20240502_210421.jpg'],
        lead: 'Камерная баня для пары или небольшой компании.',
        text: 'Уютная парная, отдельная зона отдыха и спокойный вечер у моря без лишней суеты.',
        details: ['Дровяная печь', 'Отдельная терраса', 'Чайная зона', 'Тихий отдых'],
        distance: '20 метров от моря',
        extraPerson: '+ 400 ₽ доп. человек',
        included: [
          { icon: 'towel', count: 4 },
          { icon: 'hat', count: 4 },
          { icon: 'slippers', count: 4 },
        ],
      },
    ],
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
    distance: '10 метров от моря',
    extraPerson: '+ 400 ₽ доп. человек',
    included: [
      { icon: 'towel', count: 6 },
      { icon: 'hat', count: 6 },
      { icon: 'slippers', count: 6 },
    ],
    subBaths: [
      {
        name: 'Средняя 1',
        capacity: '1-6 человек',
        price: '2 800 ₽/ч',
        image: '/images/photo-22.jpg',
        gallery: ['/images/photo-22.jpg', '/images/20211117_183306.jpg', '/images/20210509_200041.jpg'],
        lead: 'Удобная баня для компании у моря.',
        text: 'Два уровня для отдыха, просторная парная и отдельные зоны, чтобы удобно провести вечер семьей или компанией друзей.',
        details: ['Два этажа', 'Просторная парная', 'Вид на море', 'Для компании'],
        distance: '10 метров от моря',
        extraPerson: '+ 400 ₽ доп. человек',
        included: [
          { icon: 'towel', count: 6 },
          { icon: 'hat', count: 6 },
          { icon: 'slippers', count: 6 },
        ],
      },
    ],
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
    distance: '10 метров от моря',
    extraPerson: '+ 400 ₽ доп. человек',
    included: [
      { icon: 'towel', count: 8 },
      { icon: 'hat', count: 8 },
      { icon: 'slippers', count: 8 },
    ],
    subBaths: [
      {
        name: 'Большая 1',
        capacity: '1-8 человек',
        price: '3 000 ₽/ч',
        image: '/images/photo-10.jpg',
        gallery: ['/images/photo-10.jpg', '/images/20250721_204935.jpg', '/images/20201018182427_IMG_8862.JPG'],
        lead: 'Просторная баня с большой террасой.',
        text: 'Много воздуха, широкая зона отдыха и комфортный общий стол для длинного вечера после парной.',
        details: ['Очень просторно', 'Большая терраса', 'Мини-кухня', 'Для компании'],
        distance: '10 метров от моря',
        extraPerson: '+ 400 ₽ доп. человек',
        included: [
          { icon: 'towel', count: 8 },
          { icon: 'hat', count: 8 },
          { icon: 'slippers', count: 8 },
        ],
      },
      {
        name: 'Большая 2',
        capacity: '1-8 человек',
        price: '3 000 ₽/ч',
        image: '/images/20250721_204935.jpg',
        gallery: ['/images/20250721_204935.jpg', '/images/photo-10.jpg', '/images/20201018182427_IMG_8862.JPG'],
        lead: 'Уютная большая баня с панорамным видом.',
        text: 'Просторная парная, отдельная зона отдыха и всё необходимое для большой компании у моря.',
        details: ['Панорамный вид', 'Просторная парная', 'Большой стол', 'Для компании'],
        distance: '10 метров от моря',
        extraPerson: '+ 400 ₽ доп. человек',
        included: [
          { icon: 'towel', count: 8 },
          { icon: 'hat', count: 8 },
          { icon: 'slippers', count: 8 },
        ],
      },
    ],
  },
];

const wrapIndex = (value: number) => (value + baths.length) % baths.length;

export default function Baths() {
  const ref = useRef(null);
  const mobileBathRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mobileBathListRef = useRef<HTMLDivElement | null>(null);
  const mobileSubBathRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mobileSubBathListRef = useRef<HTMLDivElement | null>(null);
  const mobileScrollTimer = useRef<number | null>(null);
  const mobileSubScrollTimer = useRef<number | null>(null);
  const mobileDrag = useRef({
    hasDragged: false,
    isDragging: false,
    startScrollLeft: 0,
    startX: 0,
  });
  const mobileSubDrag = useRef({
    hasDragged: false,
    isDragging: false,
    startScrollLeft: 0,
    startX: 0,
  });
  const isInView = useInView(ref, { once: true, margin: '-120px' });
  const [active, setActive] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [subView, setSubView] = useState(false);
  const [subActive, setSubActive] = useState(0);
  const [subExpanded, setSubExpanded] = useState<number | null>(null);
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

  const selectMobileSubBath = (index: number) => {
    setSubActive(Math.max(0, Math.min((baths[active].subBaths?.length ?? 1) - 1, index)));
  };

  const centerMobileSubBath = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const list = mobileSubBathListRef.current;
    const item = mobileSubBathRefs.current[index];

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

  const selectNearestMobileSubBath = () => {
    const list = mobileSubBathListRef.current;

    if (!list) {
      return;
    }

    const listCenter = list.getBoundingClientRect().left + list.clientWidth / 2;
    const nearest = mobileSubBathRefs.current.reduce(
      (closest, node, index) => {
        if (!node) {
          return closest;
        }

        const rect = node.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - listCenter);
        return distance < closest.distance ? { distance, index } : closest;
      },
      { distance: Number.POSITIVE_INFINITY, index: subActive },
    );

    setSubActive(nearest.index);
  };

  const handleMobileSubBathScroll = () => {
    if (mobileSubScrollTimer.current) {
      window.clearTimeout(mobileSubScrollTimer.current);
    }

    mobileSubScrollTimer.current = window.setTimeout(selectNearestMobileSubBath, 90);
  };

  const handleMobileSubBathPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const list = mobileSubBathListRef.current;

    if (!list) {
      return;
    }

    mobileSubDrag.current = {
      hasDragged: false,
      isDragging: true,
      startScrollLeft: list.scrollLeft,
      startX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleMobileSubBathPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const list = mobileSubBathListRef.current;

    if (!list || !mobileSubDrag.current.isDragging) {
      return;
    }

    const deltaX = event.clientX - mobileSubDrag.current.startX;

    if (Math.abs(deltaX) > 4) {
      mobileSubDrag.current.hasDragged = true;
    }

    if (mobileSubDrag.current.hasDragged) {
      list.scrollLeft = mobileSubDrag.current.startScrollLeft - deltaX;
      event.preventDefault();
    }
  };

  const finishMobileSubBathDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!mobileSubDrag.current.isDragging) {
      return;
    }

    mobileSubDrag.current.isDragging = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    window.setTimeout(selectNearestMobileSubBath, 0);
  };

  const handleMobileSubBathClick = (index: number, isActive: boolean) => {
    if (mobileSubDrag.current.hasDragged) {
      window.setTimeout(() => {
        mobileSubDrag.current.hasDragged = false;
      }, 0);
      return;
    }

    if (isActive) {
      openSubBath(index);
      return;
    }

    selectMobileSubBath(index);
  };

  useEffect(() => {
    return () => {
      if (mobileScrollTimer.current) {
        window.clearTimeout(mobileScrollTimer.current);
      }
      if (mobileSubScrollTimer.current) {
        window.clearTimeout(mobileSubScrollTimer.current);
      }
      if (galleryFadeTimer.current) {
        window.clearTimeout(galleryFadeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (window.innerWidth > 1023) {
      return;
    }

    if (subView && subExpanded === null) {
      centerMobileSubBath(subActive);
      return;
    }

    if (!subView && expanded === null) {
      centerMobileBath(active);
    }
  }, [active, expanded, subActive, subExpanded, subView]);

  const openBath = (index: number) => {
    const hasSubBaths = baths[index].subBaths && baths[index].subBaths.length > 0;

    if (hasSubBaths) {
      setGalleryIndex(0);
      setIsClosing(false);
      setActive(index);
      setSubView(true);
      setSubActive(0);
      setSubExpanded(null);
      return;
    }

    setGalleryIndex(0);
    setIsClosing(false);
    setActive(index);
    setExpanded(index);
  };

  const openSubBath = (index: number) => {
    setGalleryIndex(0);
    setIsClosing(false);
    setSubActive(index);
    setSubExpanded(index);
  };

  const closeBath = () => {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(() => {
      if (subView) {
        setSubExpanded(null);
      } else {
        setExpanded(null);
      }
      setIsClosing(false);
      setGalleryIndex(0);
      setPrevGalleryIndex(null);
      setIsGalleryFading(false);
    }, 220);
  };

  const closeSubView = () => {
    setSubView(false);
    setSubActive(0);
    setSubExpanded(null);
    setGalleryIndex(0);
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



  const isExpandedView = expanded !== null || subExpanded !== null;
  const sliderClassName = [
    'baths-showcase__slider',
    `baths-showcase__slider--active-${active}`,
    isExpandedView ? (isClosing ? 'is-returning' : 'is-under-expanded') : '',
  ]
    .filter(Boolean)
    .join(' ');
  const expandedBath = expanded === null ? null : baths[expanded];
  const expandedSubBath = subExpanded === null ? null : (baths[active].subBaths?.[subExpanded] ?? null);
  const selectedBath = expandedSubBath ?? expandedBath ?? baths[active];

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
                    {isActive ? 'Открыть раздел' : 'Выбрать'} <b aria-hidden="true"><ArrowIcon className="h-[1em] w-[1em]" /></b>
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
                  {isActive ? 'Открыть раздел' : 'Выбрать'} <b aria-hidden="true"><ArrowIcon className="h-[1em] w-[1em]" /></b>
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

  const subBaths = baths[active].subBaths ?? [];

  const subBack = (
    <button type="button" onClick={closeSubView} className="baths-showcase__subBack">
      <svg className="baths-showcase__subBackArrow" viewBox="0 0 24 24" aria-hidden="true" fill="none">
        <path d="M20 12H4M10 6l-6 6 6 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Назад</span>
    </button>
  );

  const subSlider = (
    <div className={`baths-showcase__subView baths-showcase__subView--${subBaths.length} ${subBaths.length > 1 ? 'baths-showcase__subView--2' : ''}`}>
      {subBack}
      {subBaths.map((bath, index) => (
        <button
          key={bath.name}
          type="button"
          onClick={() => openSubBath(index)}
          className="baths-showcase__card baths-showcase__card--sub"
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
              <span className="baths-showcase__cardAction">
                Открыть раздел <b aria-hidden="true"><ArrowIcon className="h-[1em] w-[1em]" /></b>
              </span>
            </div>
          </div>
          <div className="baths-showcase__cardTop">
            <strong>{bath.price}</strong>
          </div>
        </button>
      ))}
    </div>
  );

  const mobileSubSlider = (
    <div
      ref={mobileSubBathListRef}
      className="baths-showcase__mobileList baths-showcase__mobileList--sub scrollbar-none"
      onScroll={handleMobileSubBathScroll}
      onPointerCancel={finishMobileSubBathDrag}
      onPointerDown={handleMobileSubBathPointerDown}
      onPointerLeave={finishMobileSubBathDrag}
      onPointerMove={handleMobileSubBathPointerMove}
      onPointerUp={finishMobileSubBathDrag}
      aria-label="Выбор большой бани"
    >
      {subBaths.map((bath, index) => {
        const isActive = subActive === index;

        return (
          <button
            key={bath.name}
            ref={(node) => {
              mobileSubBathRefs.current[index] = node;
            }}
            type="button"
            onClick={() => handleMobileSubBathClick(index, isActive)}
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
                  {isActive ? 'Открыть раздел' : 'Выбрать'} <b aria-hidden="true"><ArrowIcon className="h-[1em] w-[1em]" /></b>
                </motion.span>
              </AnimatePresence>
            </div>
          </button>
        );
      })}
    </div>
  );

  const mobileSubControls = (
    <div
      className="baths-showcase__mobileControls baths-showcase__mobileControls--sub"
      aria-label="Mobile large bath navigation"
    >
      {subBack}
      <div className="baths-showcase__mobileIndicator">
        <span>{String(subActive + 1).padStart(2, '0')}</span>
        <div className="baths-showcase__mobileDots" aria-label="Large bath selection">
          {subBaths.map((bath, index) => (
            <button
              key={bath.name}
              type="button"
              onClick={() => selectMobileSubBath(index)}
              className={subActive === index ? 'is-active' : ''}
              aria-label={`Show large bath ${index + 1}`}
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
        <AnimatePresence>
          {!subView && !isExpandedView && (
            <motion.div
              key="baths-main"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="baths-showcase__viewWrap"
            >
              {slider}
              {mobileSlider}
              {mobileControls}
            </motion.div>
          )}
          {subView && subExpanded === null && (
            <motion.div
              key="baths-sub"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="baths-showcase__viewWrap"
            >
              {subSlider}
              {mobileSubSlider}
              {mobileSubControls}
            </motion.div>
          )}
        </AnimatePresence>

        {isExpandedView && selectedBath && (
          <div className={`baths-showcase__expanded ${isClosing ? 'is-closing' : 'is-opening'}`}>
            <div className="baths-showcase__morphPreview" aria-hidden="true">
                <img src={selectedBath.image} alt={selectedBath.name} />
                <div className="baths-showcase__cardShade" />
                <div className="baths-showcase__cardInfo">
                  <div>
                    <PeopleIcon className="baths-showcase__peopleIcon" />
                    {selectedBath.capacity}
                  </div>
                  <h3 className={selectedBath.name === 'Большие бани' ? 'is-wide-name' : undefined}>{selectedBath.name}</h3>
                  <span>
                    Открыть раздел <b aria-hidden="true"><ArrowIcon className="h-[1em] w-[1em]" /></b>
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
                    <svg viewBox="0 0 32 32" aria-hidden="true">
                      <path d="M27 16H7M14 9l-7 7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchGallery((galleryIndex + 1) % selectedBath.gallery.length)}
                    className="baths-showcase__expandedArrow baths-showcase__expandedArrow--right"
                    aria-label="Следующее фото"
                  >
                    <svg viewBox="0 0 32 32" aria-hidden="true">
                      <path d="M5 16h20M18 9l7 7-7 7" />
                    </svg>
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
                    <svg className="baths-showcase__backArrow" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20 12H4M10 6l-6 6 6 6" />
                    </svg>
                    <span>Вернуться</span>
                  </button>
                  <div className="baths-showcase__capacity">
                    <PeopleIcon className="baths-showcase__capacityIcon" />
                    {selectedBath.capacity}
                  </div>
                  <h3 className={selectedBath.name === 'Большие бани' ? 'is-wide-name' : undefined}>{selectedBath.name}</h3>

                  <div className="baths-showcase__included">
                    <div className="baths-showcase__includedTitle">Включено в стоимость:</div>
                    <div className="baths-showcase__includedList">
                      {selectedBath.included.map((item) => {
                        const src = iconPaths[item.icon];
                        return (
                          <div key={item.icon} className="baths-showcase__includedItem">
                            <span
                              aria-hidden="true"
                              className="baths-showcase__includedIcon"
                              style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` }}
                            />
                            <span className="baths-showcase__includedCount">{item.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="baths-showcase__meta">
                    <div className="baths-showcase__metaItem">
                      <span
                        aria-hidden="true"
                        className="baths-showcase__metaIcon"
                        style={{
                          WebkitMaskImage: `url(${iconPaths.location})`,
                          maskImage: `url(${iconPaths.location})`,
                        }}
                      />
                      <span>{selectedBath.distance}</span>
                    </div>
                    <div className="baths-showcase__metaItem">
                      <span
                        aria-hidden="true"
                        className="baths-showcase__metaIcon baths-showcase__metaIcon--people"
                        style={{
                          WebkitMaskImage: `url(${iconPaths.peoplePlus})`,
                          maskImage: `url(${iconPaths.peoplePlus})`,
                        }}
                      />
                      <span>{selectedBath.extraPerson}</span>
                    </div>
                  </div>

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
