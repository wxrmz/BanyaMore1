'use client';

import { useEffect, useRef } from 'react';

type CloseHandler = () => void;
type OverlayEntry = { id: number; close: CloseHandler };

const overlays: OverlayEntry[] = [];
let nextOverlayId = 1;
let isListening = false;

const handlePopState = () => {
  const top = overlays.pop();
  top?.close();

  if (!overlays.length && isListening) {
    window.removeEventListener('popstate', handlePopState);
    isListening = false;
  }
};

/**
 * Кнопка «Назад» на Android (и жест возврата в браузере) закрывает открытую
 * карточку или окно, а не уводит с сайта. Каждый открытый слой добавляет свою
 * запись в историю и убирает её, если закрылся обычным способом.
 */
export function useCloseOnBack(isOpen: boolean, close: CloseHandler) {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const entry: OverlayEntry = { id: nextOverlayId, close: () => closeRef.current() };
    nextOverlayId += 1;
    overlays.push(entry);

    if (!isListening) {
      window.addEventListener('popstate', handlePopState);
      isListening = true;
    }

    window.history.pushState({ overlay: entry.id }, '');

    return () => {
      const index = overlays.indexOf(entry);

      if (index !== -1) {
        overlays.splice(index, 1);
        // Слой закрыли кнопкой на странице, а не «Назад» — убираем свою запись из истории.
        if ((window.history.state as { overlay?: number } | null)?.overlay === entry.id) {
          window.history.back();
        }
      }

      if (!overlays.length && isListening) {
        window.removeEventListener('popstate', handlePopState);
        isListening = false;
      }
    };
  }, [isOpen]);
}
