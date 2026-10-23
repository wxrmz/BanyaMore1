/**
 * Сайт живёт по времени бани, а не по часам посетителя. Без этого гость из
 * Екатеринбурга видел бы на пять часов больше «свободных» окон: его 14:00 —
 * это уже 19:00 во Владивостоке, и половина дня по факту прошла.
 */
export const VLADIVOSTOK_TIME_ZONE = 'Asia/Vladivostok';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: VLADIVOSTOK_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: VLADIVOSTOK_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Сегодняшняя дата во Владивостоке в формате YYYY-MM-DD. */
export const vladivostokDate = (now: Date = new Date()) => dateFormatter.format(now);

/** Минуты, прошедшие с полуночи во Владивостоке. */
export const vladivostokMinutes = (now: Date = new Date()) => {
  const parts = timeFormatter.formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return value('hour') * 60 + value('minute');
};

/** Дата и время во Владивостоке одним вызовом — чтобы они не разъезжались на границе суток. */
export const vladivostokDateTime = (now: Date = new Date()) => ({
  date: vladivostokDate(now),
  minutes: vladivostokMinutes(now),
});
