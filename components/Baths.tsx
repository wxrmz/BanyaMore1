'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';

const baths = [
  {
    name: 'Малая баня',
    capacity: '1-4 человека',
    price: '2 500 ₽/ч',
    image: '/images/photo-5.jpg',
    gallery: ['/images/photo-5.jpg', '/images/photo-1.jpg', '/images/20240502_210421.jpg'],
    lead: 'Камерный формат для пары или небольшой компании.',
    text: 'Уютная парная, отдельная зона отдыха и спокойный вечер у моря без лишней суеты.',
    details: ['Дровяная печь', 'Отдельная терраса', 'Чайная зона', 'Тихий отдых'],
  },
  {
    name: 'Средняя баня',
    capacity: '1-6 человек',
    price: '2 800 ₽/ч',
    image: '/images/photo-22.jpg',
    gallery: ['/images/photo-22.jpg', '/images/20211117_183306.jpg', '/images/20210509_200041.jpg'],
    lead: 'Баланс пространства, цены и приватности.',
    text: 'Удобный формат для семьи или компании друзей: просторная парная, комната отдыха и вид на море.',
    details: ['Просторная парная', 'Комната отдыха', 'Вид на море', 'Для семьи'],
  },
  {
    name: 'Большая баня',
    capacity: '1-8 человек',
    price: '3 000 ₽/ч',
    image: '/images/photo-10.jpg',
    gallery: ['/images/photo-10.jpg', '/images/20250721_204935.jpg', '/images/20201018182427_IMG_8862.JPG'],
    lead: 'Для большой компании и длинного вечера у воды.',
    text: 'Больше места, больше воздуха и комфортный общий стол для отдыха после парной.',
    details: ['Большая терраса', 'Мини-кухня', 'Больше мест', 'Для компании'],
  },
];

const wrapIndex = (value: number) => (value + baths.length) % baths.length;

export default function Baths() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-120px' });
  const [active, setActive] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  const shift = (direction: -1 | 1) => {
    setActive((value) => wrapIndex(value + direction));
  };

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
    }, 320);
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
      <button type="button" onClick={() => shift(-1)} className="baths-showcase__sideArrow baths-showcase__sideArrow--left" aria-label="Предыдущая баня">
        ←
      </button>
      <button type="button" onClick={() => shift(1)} className="baths-showcase__sideArrow baths-showcase__sideArrow--right" aria-label="Следующая баня">
        →
      </button>

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
              setActive(index);
            }}
            className={`baths-showcase__card ${positionClass} ${isActive ? 'is-selected' : ''}`}
            aria-pressed={isActive}
          >
            <div className="baths-showcase__cardShell">
              <img src={bath.image} alt={bath.name} />
              <div className="baths-showcase__cardShade" />
              <div className="baths-showcase__cardTop">
                <strong>{bath.price}</strong>
              </div>
              <div className="baths-showcase__cardInfo">
                <div>{bath.capacity}</div>
                <h3>{bath.name}</h3>
                <p>{bath.lead}</p>
                <span>{isActive ? 'Открыть баню' : 'Выбрать'} →</span>
              </div>
            </div>
          </button>
        );
      })}

      <div className="baths-showcase__dots" aria-label="Выбор бани">
        {baths.map((bath, index) => (
          <button
            key={bath.name}
            type="button"
            onClick={() => setActive(index)}
            className={active === index ? 'is-active' : ''}
            aria-label={`Показать ${bath.name}`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <section id="baths" className="baths-showcase" ref={ref}>
      <div className="baths-showcase__glow" />

      <div className="baths-showcase__head container-custom">
        <motion.div
          initial={{ y: 34, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.62 }}
        >
          <div className="eyebrow">Бани</div>
          <h2 className="section-title mt-5 max-w-4xl">Выберите свой формат у моря.</h2>
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 34, opacity: 0 }}
        animate={isInView ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: 0.7, delay: 0.08, ease: 'easeOut' }}
        className="baths-showcase__stage"
      >
        {slider}

        {expandedBath && (
          <div className={`baths-showcase__expanded ${isClosing ? 'is-closing' : 'is-opening'}`}>
            <div className="baths-showcase__morphPreview" aria-hidden="true">
                <img src={selectedBath.image} alt={selectedBath.name} />
                <div className="baths-showcase__cardShade" />
                <div className="baths-showcase__cardTop">
                  <strong>{selectedBath.price}</strong>
                </div>
                <div className="baths-showcase__cardInfo">
                  <div>{selectedBath.capacity}</div>
                  <h3 className={expanded === 2 ? 'is-wide-name' : undefined}>{selectedBath.name}</h3>
                  <p>{selectedBath.lead}</p>
                  <span>Открыть баню →</span>
                </div>
              </div>
            <div className="baths-showcase__expandedContent">
                <div className="baths-showcase__expandedMedia">
                  <img
                    key={selectedBath.gallery[galleryIndex]}
                    src={selectedBath.gallery[galleryIndex]}
                    alt={selectedBath.name}
                    className="baths-showcase__expandedImage"
                  />
                  <div className="baths-showcase__expandedShade" />
                  <div className="baths-showcase__thumbs" aria-label="Фотографии бани">
                    {selectedBath.gallery.map((image, index) => (
                      <button
                        key={image}
                        type="button"
                        onClick={() => setGalleryIndex(index)}
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
                    ← Вернуться
                  </button>
                  <div className="eyebrow">{selectedBath.capacity}</div>
                  <h3 className={expanded === 2 ? 'is-wide-name' : undefined}>{selectedBath.name}</h3>
                  <p className="baths-showcase__lead">{selectedBath.lead}</p>
                  <p>{selectedBath.text}</p>

                  <div className="baths-showcase__bookingLabel">В формате</div>
                  <div className="baths-showcase__detailList">
                    {selectedBath.details.map((detail) => (
                      <div key={detail}>{detail}</div>
                    ))}
                  </div>
                  <div className="baths-showcase__actions">
                    <div className="baths-showcase__price">
                      <strong>{selectedBath.price}</strong>
                      <span>стоимость</span>
                    </div>
                    <a href="https://w1437834.yclients.com/" target="_blank" rel="noopener noreferrer" className="btn-primary baths-showcase__bookButton">
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
