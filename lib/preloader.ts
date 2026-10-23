'use client';

import { useSyncExternalStore } from 'react';

// Общий сигнал «экран загрузки ушёл». Первый экран ждёт его, чтобы анимация
// появления шла на глазах у посетителя, а не под заставкой.
let isDone = false;
const listeners = new Set<() => void>();

export function markPreloaderDone() {
  if (isDone) return;
  isDone = true;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function usePreloaderDone() {
  return useSyncExternalStore(
    subscribe,
    () => isDone,
    () => false,
  );
}
