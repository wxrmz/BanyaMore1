// Открытие и закрытие фото во весь экран. Без явного transition
// framer-motion двигает и масштабирует пружиной, и фото слегка
// «подпрыгивало» в конце. Здесь — плавное замедление без отскока.
export const lightboxFigureTransition = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1],
} as const;
