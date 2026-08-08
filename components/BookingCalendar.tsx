'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowIcon } from './ArrowIcon';

type CalendarSlot = {
  time: string;
  available: boolean;
  canStartBooking?: boolean;
  status?: 'free' | 'busy' | 'cleaning';
  service?: string;
  serviceId?: number;
  staff?: string;
  staffId?: number;
};

type CalendarDay = {
  date: string;
  label: string;
  weekday: string;
  freeCount: number;
  slots: CalendarSlot[];
};

type CalendarBath = {
  id: string;
  title: string;
  freeCount: number;
  staffId: number;
  bookingServices: BookingService[];
  days: CalendarDay[];
};

type BookingService = {
  durationMinutes: number;
  label: string;
  serviceId: number;
};

type AvailabilityResponse = {
  ok: boolean;
  companyId?: string;
  bookingUrl: string;
  message?: string;
  baths?: CalendarBath[];
  days?: CalendarDay[];
};

type CalendarNoteResponse = {
  ok: boolean;
  text?: string;
};

const currentDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    minutes: now.getHours() * 60 + now.getMinutes(),
  };
};

const todayDate = () => currentDateTime().date;

const addDaysToDate = (date: string, amount: number) => {
  const next = new Date(`${date}T00:00:00+10:00`);
  next.setDate(next.getDate() + amount);
  const year = next.getFullYear();
  const month = `${next.getMonth() + 1}`.padStart(2, '0');
  const day = `${next.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SLOT_GROUPS = [
  { id: 'night', title: 'Ночь', from: '00:00', to: '05:30' },
  { id: 'morning', title: 'Утро', from: '06:00', to: '11:30' },
  { id: 'day', title: 'День', from: '12:00', to: '17:30' },
  { id: 'evening', title: 'Вечер', from: '18:00', to: '23:30' },
];

const isInRange = (time: string, from: string, to: string) => time >= from && time <= to;

const FULL_DAY_TIMES = Array.from({ length: 48 }, (_, index) => {
  const minutes = index * 30;
  const hour = `${Math.floor(minutes / 60)}`.padStart(2, '0');
  const minute = `${minutes % 60}`.padStart(2, '0');
  return `${hour}:${minute}`;
});
const VISIBLE_DAYS = 7;
const REQUEST_DAYS = VISIBLE_DAYS + 1;
const CLEANING_MINUTES = 30;
const SLOT_INTERVAL_MINUTES = 30;

const normalizeSlots = (slots: CalendarSlot[] = []) => {
  const byTime = new Map(slots.map((slot) => [slot.time, slot]));
  return FULL_DAY_TIMES.map((time) => byTime.get(time) ?? { time, available: false });
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number) => {
  const dayMinutes = 24 * 60;
  const normalizedMinutes = ((minutes % dayMinutes) + dayMinutes) % dayMinutes;
  const hours = `${Math.floor(normalizedMinutes / 60)}`.padStart(2, '0');
  const minute = `${normalizedMinutes % 60}`.padStart(2, '0');
  return `${hours}:${minute}`;
};

const isPastSlotTime = (date: string, time: string, currentDate: string, currentMinutes: number) => {
  if (date < currentDate) {
    return true;
  }

  if (date > currentDate) {
    return false;
  }

  return timeToMinutes(time) + SLOT_INTERVAL_MINUTES <= currentMinutes;
};

const formatWidgetDateTime = (date: string, time: string) => {
  const [year, month, day] = date.split('-');
  const [hours, minutes] = time.split(':');
  return `${year.slice(2)}${day}${month}${hours}${minutes}`;
};

const buildBookingUrl = (baseUrl: string, companyId: string, bath: CalendarBath, date: string, time: string, service: BookingService) => {
  const url = new URL(baseUrl);
  url.pathname = `/company/${companyId}/personal/select-services`;
  url.searchParams.set('o', `m${bath.staffId}s${service.serviceId}d${formatWidgetDateTime(date, time)}`);
  return url.toString();
};

export default function BookingCalendar() {
  const selectedTimePanelRef = useRef<HTMLDivElement | null>(null);
  const selectedTimePanelVisibleRef = useRef(false);
  const [baths, setBaths] = useState<CalendarBath[]>([]);
  const [selectedBathId, setSelectedBathId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentDate, setCurrentDate] = useState(todayDate);
  const [currentMinutes, setCurrentMinutes] = useState(() => currentDateTime().minutes);
  const [weekStart, setWeekStart] = useState(todayDate);
  const [selectedStartTime, setSelectedStartTime] = useState('');
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<number | null>(null);
  const [bookingUrl, setBookingUrl] = useState('https://n1437834.yclients.com/');
  const [companyId, setCompanyId] = useState('1300176');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [calendarNote, setCalendarNote] = useState('');

  useEffect(() => {
    let timer: number;

    const syncCurrentTime = () => {
      const nextCurrentDateTime = currentDateTime();
      setCurrentDate(nextCurrentDateTime.date);
      setCurrentMinutes(nextCurrentDateTime.minutes);

      const now = new Date();
      const nextMinuteDelay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 100;
      timer = window.setTimeout(syncCurrentTime, Math.max(nextMinuteDelay, 1000));
    };

    syncCurrentTime();

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setWeekStart((value) => (value < currentDate ? currentDate : value));
  }, [currentDate]);

  useEffect(() => {
    let ignore = false;

    async function loadAvailability() {
      setStatus('loading');

      try {
        const response = await fetch(`/api/yclients/availability?from=${weekStart}&days=${REQUEST_DAYS}`, {
          cache: 'no-store',
        });
        const payload = (await response.json()) as AvailabilityResponse;

        if (ignore) {
          return;
        }

        setBookingUrl(payload.bookingUrl || 'https://n1437834.yclients.com/');
        setCompanyId(payload.companyId || '1300176');

        const fallbackBaths = payload.days?.length
          ? [
              {
                id: 'all',
                title: 'Все бани',
                freeCount: payload.days.reduce((sum, day) => sum + day.freeCount, 0),
                staffId: 0,
                bookingServices: [],
                days: payload.days,
              },
            ]
          : [];
        const nextBaths = payload.baths?.length ? payload.baths : fallbackBaths;

        if (!response.ok || !payload.ok || !nextBaths.length) {
          setBaths([]);
          setMessage('Пока не можем показать свободные окна, но онлайн-запись доступна по кнопке ниже.');
          setStatus('error');
          return;
        }

        setBaths(nextBaths);
        setSelectedBathId(nextBaths[0]?.id ?? '');
        setSelectedDate(nextBaths[0]?.days[0]?.date ?? '');
        setMessage('');
        setStatus('ready');
      } catch {
        if (!ignore) {
          setBaths([]);
          setMessage('Пока не можем показать свободные окна, но онлайн-запись доступна по кнопке ниже.');
          setStatus('error');
        }
      }
    }

    loadAvailability();

    return () => {
      ignore = true;
    };
  }, [weekStart, reloadKey]);

  useEffect(() => {
    let ignore = false;

    async function loadCalendarNote() {
      try {
        const response = await fetch('/api/calendar-note', { cache: 'no-store' });
        const payload = (await response.json()) as CalendarNoteResponse;

        if (!ignore && response.ok && payload.ok) {
          setCalendarNote((payload.text ?? '').trim());
        }
      } catch {
        if (!ignore) {
          setCalendarNote('');
        }
      }
    }

    loadCalendarNote();

    return () => {
      ignore = true;
    };
  }, []);

  const selectedBath = useMemo(() => baths.find((bath) => bath.id === selectedBathId) ?? baths[0], [baths, selectedBathId]);
  const days = selectedBath?.days ?? [];
  const visibleDays = useMemo(() => days.slice(0, VISIBLE_DAYS), [days]);
  const selectedDay = useMemo(() => visibleDays.find((day) => day.date === selectedDate) ?? visibleDays[0] ?? days[0], [days, visibleDays, selectedDate]);
  const selectedDayIndex = useMemo(() => days.findIndex((day) => day.date === selectedDay?.date), [days, selectedDay?.date]);
  const selectedSlots = useMemo(() => normalizeSlots(selectedDay?.slots), [selectedDay]);
  const selectedSlotsByOffset = useMemo(() => {
    const slotsByOffset = new Map<number, CalendarSlot>();

    if (selectedDayIndex < 0) {
      return slotsByOffset;
    }

    [0, 1].forEach((dayOffset) => {
      const day = days[selectedDayIndex + dayOffset];

      if (!day) {
        return;
      }

      normalizeSlots(day.slots).forEach((slot) => {
        slotsByOffset.set(dayOffset * 24 * 60 + timeToMinutes(slot.time), slot);
      });
    });

    return slotsByOffset;
  }, [days, selectedDayIndex]);
  const selectedSlot = useMemo(
    () => selectedSlots.find((slot) => slot.time === selectedStartTime),
    [selectedSlots, selectedStartTime],
  );
  const durationOptions = useMemo(() => {
    if (!selectedBath || !selectedStartTime) {
      return [];
    }

    const start = timeToMinutes(selectedStartTime);
    const minimumDuration = selectedBath.bookingServices[0]?.durationMinutes ?? 120;

    return selectedBath.bookingServices.filter((service) => {
      if (service.durationMinutes <= minimumDuration) {
        return selectedSlot?.available && selectedSlot.canStartBooking !== false;
      }

      const end = start + service.durationMinutes;
      const requiredEnd = end + CLEANING_MINUTES;

      for (let cursor = start; cursor < requiredEnd; cursor += 30) {
        const slot = selectedSlotsByOffset.get(cursor);

        if (!slot?.available) {
          return false;
        }
      }

      return true;
    });
  }, [selectedBath, selectedSlot, selectedSlotsByOffset, selectedStartTime]);
  const selectedService = useMemo(
    () => durationOptions.find((service) => service.durationMinutes === selectedDurationMinutes) ?? durationOptions[0],
    [durationOptions, selectedDurationMinutes],
  );
  const selectedEndTime =
    selectedStartTime && selectedService ? minutesToTime(timeToMinutes(selectedStartTime) + selectedService.durationMinutes) : '';
  const selectedBookingUrl =
    selectedBath && selectedDay && selectedStartTime && selectedService
      ? buildBookingUrl(bookingUrl, companyId, selectedBath, selectedDay.date, selectedStartTime, selectedService)
      : bookingUrl;
  const isLoadingSchedule = status === 'loading';
  const canGoBack = weekStart > currentDate && !isLoadingSchedule;
  const canGoForward = !isLoadingSchedule;

  useEffect(() => {
    setSelectedStartTime('');
    setSelectedDurationMinutes(null);
  }, [selectedBath?.id, selectedDate]);

  useEffect(() => {
    if (!selectedDay || !selectedStartTime) {
      return;
    }

    if (isPastSlotTime(selectedDay.date, selectedStartTime, currentDate, currentMinutes)) {
      setSelectedStartTime('');
      setSelectedDurationMinutes(null);
    }
  }, [currentDate, currentMinutes, selectedDay?.date, selectedStartTime]);

  useEffect(() => {
    if (!selectedStartTime) {
      return;
    }

    if (!durationOptions.length) {
      setSelectedDurationMinutes(null);
      return;
    }

    if (!durationOptions.some((service) => service.durationMinutes === selectedDurationMinutes)) {
      setSelectedDurationMinutes(durationOptions[0].durationMinutes);
    }
  }, [durationOptions, selectedDurationMinutes, selectedStartTime]);

  useEffect(() => {
    if (!selectedStartTime) {
      selectedTimePanelVisibleRef.current = false;
      return;
    }

    const isOpening = !selectedTimePanelVisibleRef.current;
    selectedTimePanelVisibleRef.current = true;

    if (window.innerWidth > 639) {
      return;
    }

    const scrollFrame = window.requestAnimationFrame(() => {
      const panel = selectedTimePanelRef.current;
      if (!panel) {
        return;
      }

      const headerOffset = 76;
      const entranceTravel = isOpening ? 28 : 0;
      const top = panel.getBoundingClientRect().top + window.scrollY + entranceTravel - headerOffset - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(scrollFrame);
  }, [selectedStartTime]);

  return (
    <section id="schedule" className="schedule-section layer-mid relative overflow-hidden bg-[#080706] pt-10 pb-14 sm:pt-12 sm:pb-16 lg:pt-16 lg:pb-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(214,161,95,0.12),transparent_34rem),radial-gradient(circle_at_82%_44%,rgba(131,147,154,0.10),transparent_30rem)]" />
      <div className="relative mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
        <div className="mb-10 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="eyebrow text-[22px] sm:text-[24px] lg:text-[26px]">Запись</div>
            <h2 className="section-title mt-5 max-w-4xl">
              Свободное время у моря
            </h2>
          </motion.div>
          <motion.div
            initial={{ y: 22, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="hidden min-h-[56px] items-center gap-4 rounded-2xl border border-[#d6a15f]/55 bg-[#21170f]/70 px-5 py-3 shadow-[inset_0_1px_0_rgba(214,161,95,0.14),0_18px_55px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:flex"
          >
            <span className="inline-flex items-center gap-2 text-[15px] font-extrabold uppercase tracking-[0.14em] text-[#d8d0c4]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#d6a15f]" />
              свободно
            </span>
            <span className="inline-flex items-center gap-2 text-[15px] font-extrabold uppercase tracking-[0.14em] text-[#8f857a]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#3a3026]" />
              занято
            </span>
            <span className="inline-flex items-center gap-2 text-[15px] font-extrabold uppercase tracking-[0.14em] text-[#bfa06d]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#6b4523]" />
              уборка 30 мин
            </span>
            <span className="inline-flex items-center gap-2 text-[15px] font-extrabold uppercase tracking-[0.14em] text-[#b9a58a]">
              <span className="h-2.5 w-2.5 rounded-full border border-[#d6a15f]/65 bg-[#2c241c]" />
              недоступно
            </span>
          </motion.div>
        </div>

          <motion.div
            initial={{ y: 28, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.58, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="schedule-calendar-panel rounded-2xl border border-[#d6a15f]/75 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.24)] sm:p-6 lg:p-7"
          >
            <div className="hidden">
              <div>
                <div className="text-[13px] font-extrabold uppercase tracking-[0.18em] text-[#d6a15f]">Ближайшие 7 дней</div>
                <div className="mt-2 text-2xl font-extrabold text-[#f4eee4] sm:text-3xl">{selectedDay ? selectedDay.label : 'Расписание'}</div>
                {selectedBath && (
                  <div className="mt-2 text-sm font-bold uppercase tracking-[0.16em] text-[#bfa06d]">{selectedBath.title}</div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[14px] font-bold text-[#b9aea0] sm:hidden">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#d6a15f]" />
                  свободно
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#3a3026]" />
                  занято
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#6b4523]" />
                  уборка 30 мин
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full border border-[#d6a15f]/65 bg-[#2c241c]" />
                  недоступно
                </span>
              </div>
              <div className="inline-flex w-fit min-h-[48px] items-center rounded-xl border border-[#d6a15f]/75 bg-[#21170f]/70 px-4 text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#d6a15f]">
                {status === 'loading' ? 'Обновляем расписание' : 'Расписание недоступно'}
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
            {status === 'loading' && (
              <motion.div
                key="schedule-loading"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="grid min-h-[500px] place-items-center text-center lg:min-h-[530px]"
              >
                <div>
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-[#d6a15f]/35 border-t-[#d6a15f]" />
                  <div className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-[#d6a15f]">Загружаем расписание</div>
                </div>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="schedule-error"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="grid min-h-[520px] place-items-center text-center lg:min-h-[555px]"
              >
                <div className="max-w-sm">
                  <div className="text-2xl font-extrabold text-[#f4eee4]">Расписание скоро появится</div>
                  <p className="mt-4 text-base font-semibold leading-7 text-[#b9aea0]">{message}</p>
                  <button
                    type="button"
                    onClick={() => setReloadKey((value) => value + 1)}
                    className="mt-6 inline-flex min-h-[46px] items-center justify-center rounded-lg border border-[#d6a15f] bg-[#d6a15f] px-5 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#15110d] transition hover:-translate-y-0.5"
                  >
                    Попробовать еще раз
                  </button>
                </div>
              </motion.div>
            )}

            {status === 'ready' && selectedDay && (
              <motion.div
                key="schedule-ready"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mt-1 grid gap-3 sm:mt-2 sm:grid-cols-3 lg:mt-1">
                  {baths.map((bath) => {
                    const isActive = bath.id === selectedBath?.id;

                    return (
                      <button
                        key={bath.id}
                        type="button"
                        onClick={() => {
                          setSelectedBathId(bath.id);
                          setSelectedDate((currentDate) =>
                            bath.days.slice(0, VISIBLE_DAYS).some((day) => day.date === currentDate) ? currentDate : bath.days[0]?.date ?? '',
                          );
                        }}
                        className={`flex h-[68px] items-center justify-center rounded-xl border px-5 text-center transition duration-300 ease-out ${
                          isActive
                            ? '-translate-y-0.5 border-[#d6a15f]/90 bg-[#d6a15f] text-[#15110d] shadow-[0_14px_34px_rgba(214,161,95,0.22)]'
                            : 'border-[#d6a15f]/55 bg-[#21170f]/45 text-[#f4eee4] hover:-translate-y-0.5 hover:border-[#d6a15f]/80'
                        }`}
                      >
                        <span className="block text-[22px] font-extrabold leading-tight">{bath.title}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 grid min-w-0 grid-cols-[34px_minmax(0,1fr)_34px] gap-1.5 sm:grid-cols-[58px_1fr_58px] sm:gap-3">
                  <button
                    type="button"
                    aria-label="Предыдущая неделя"
                    onClick={() => {
                      if (canGoBack) {
                        setWeekStart((current) => {
                          const previous = addDaysToDate(current, -7);
                          return previous < currentDate ? currentDate : previous;
                        });
                      }
                    }}
                    disabled={!canGoBack}
                    aria-disabled={!canGoBack}
                    className={`flex min-h-[58px] items-center justify-center rounded-lg border text-2xl font-extrabold leading-none transition sm:min-h-0 ${
                      canGoBack
                        ? 'border-[#d6a15f]/55 bg-[#21170f]/45 text-[#d6a15f] hover:border-[#d6a15f]/80 hover:bg-[#d6a15f] hover:text-[#15110d]'
                        : 'pointer-events-none border-[#d6a15f]/18 bg-[#17110c]/35 text-[#5f5448]'
                    }`}
                  >
                    <ArrowIcon className="h-6 w-6" direction="left" />
                  </button>
                  <div className="schedule-date-strip scrollbar-none flex min-w-0 snap-x gap-1.5 overflow-x-auto py-1 sm:grid sm:grid-cols-2 sm:gap-2 sm:overflow-visible sm:py-0 md:grid-cols-4 lg:grid-cols-7">
                    {visibleDays.map((day) => {
                      const isActive = day.date === selectedDay.date;
                      const [dayNumber, ...dayMonthParts] = day.label.split(' ');

                      return (
                        <button
                          key={day.date}
                          type="button"
                          onClick={() => setSelectedDate(day.date)}
                          className={`schedule-date-button${isActive ? ' schedule-date-button--active' : ''} min-w-[92px] snap-start rounded-lg border px-3 py-3 text-left transition duration-300 ease-out sm:min-w-0 sm:px-4 sm:py-3.5 ${
                            isActive
                              ? '-translate-y-0.5 border-[#d6a15f]/80 bg-[#d6a15f] text-[#15110d] shadow-[0_14px_34px_rgba(214,161,95,0.22)]'
                              : 'border-[#d6a15f]/55 bg-[#21170f]/45 text-[#f4eee4] hover:-translate-y-0.5 hover:border-[#d6a15f]/80'
                          }`}
                        >
                          <span className="block text-[12px] font-extrabold uppercase tracking-[0.14em] opacity-75 sm:text-[13px]">{day.weekday}</span>
                          <span className="mt-1 block text-[18px] font-extrabold leading-none sm:text-[20px]">
                            <span>{dayNumber}</span>
                            {dayMonthParts.length > 0 && <span className="schedule-date-month"> {dayMonthParts.join(' ')}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    aria-label="Следующая неделя"
                    onClick={() => {
                      if (canGoForward) {
                        setWeekStart((current) => addDaysToDate(current, 7));
                      }
                    }}
                    disabled={!canGoForward}
                    aria-disabled={!canGoForward}
                    className={`flex min-h-[58px] items-center justify-center rounded-lg border text-2xl font-extrabold leading-none transition sm:min-h-0 ${
                      canGoForward
                        ? 'border-[#d6a15f]/55 bg-[#21170f]/45 text-[#d6a15f] hover:border-[#d6a15f]/80 hover:bg-[#d6a15f] hover:text-[#15110d]'
                        : 'pointer-events-none border-[#d6a15f]/18 bg-[#17110c]/35 text-[#5f5448]'
                    }`}
                  >
                    <ArrowIcon className="h-6 w-6" />
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {selectedStartTime && selectedSlot?.available && (
                  <motion.div
                    ref={selectedTimePanelRef}
                    key="selected-time-panel"
                    initial={{ height: 0, opacity: 0, y: -8, marginTop: 0 }}
                    animate={{ height: 'auto', opacity: 1, y: 0, marginTop: 20 }}
                    exit={{ height: 0, opacity: 0, y: -8, marginTop: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="relative overflow-hidden rounded-xl bg-[#21170f]/55 will-change-[height,margin,opacity,transform]"
                  >
                    <span className="pointer-events-none absolute inset-0 rounded-xl border border-[#d6a15f]/55" />
                    <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                      <div className="shrink-0">
                        <div className="text-[16px] font-extrabold uppercase tracking-[0.16em] text-[#d6a15f] sm:text-[18px]">Выбранный промежуток</div>
                        <div className="mt-2 text-3xl font-extrabold text-[#f4eee4] sm:text-[34px]">
                          {selectedStartTime}
                          {selectedEndTime ? `-${selectedEndTime}` : ''}
                        </div>
                        <div className="mt-2 text-lg font-bold text-[#b9aea0] sm:text-xl">{selectedBath?.title}</div>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-wrap justify-start gap-3 sm:pl-3 lg:pl-6">
                        {durationOptions.map((service) => {
                          const isActive = service.durationMinutes === selectedService?.durationMinutes;

                          return (
                            <button
                              key={service.serviceId}
                              type="button"
                              onClick={() => setSelectedDurationMinutes(service.durationMinutes)}
                              className={`shrink-0 rounded-lg border px-4 py-2.5 text-[13px] font-extrabold uppercase tracking-[0.1em] transition sm:px-5 sm:text-[14px] ${
                                isActive
                                  ? 'border-[#d6a15f] bg-[#d6a15f] text-[#15110d]'
                                  : 'border-[#d6a15f]/45 bg-[#15110d]/70 text-[#f4eee4] hover:border-[#d6a15f]/80'
                              }`}
                            >
                              <span className="inline-block scale-[1.1]">{service.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-base font-semibold leading-7 text-[#8f857a]">
                        <span className="block origin-left scale-[1.08] transform-gpu">
                          {durationOptions.length
                            ? 'Виджет откроется уже с выбранной баней, датой, временем и длительностью.'
                            : 'Для этого старта нет подходящей длительности в виджете.'}
                        </span>
                      </div>
                      {selectedService && (
                        <a
                          href={selectedBookingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="schedule-selected-book-button inline-flex min-h-[54px] items-center justify-center rounded-lg border border-[#d6a15f] bg-[#d6a15f] px-6 text-[14px] font-extrabold uppercase tracking-[0.12em] text-[#15110d] transition duration-300 ease-out hover:-translate-y-0.5 hover:border-[#e5b374] hover:bg-[#e5b374] sm:px-7 sm:text-[15px]"
                        >
                          <span className="inline-block origin-center scale-[1.12] transform-gpu">Забронировать</span>
                        </a>
                      )}
                    </div>
                    </div>
                  </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-7 grid gap-8 xl:grid-cols-4 xl:gap-8 2xl:gap-9">
                  {SLOT_GROUPS.map((group) => {
                    const slots = selectedSlots.filter((slot) => isInRange(slot.time, group.from, group.to));

                    return (
                      <div key={group.id}>
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="font-sans text-[20px] font-extrabold leading-none text-[#f4eee4] sm:text-[21px]">{group.title}</h3>
                          <span className="text-[15px] font-extrabold uppercase tracking-[0.06em] text-[#bfa06d] sm:text-[17px] sm:tracking-[0.08em]">
                            {group.from}-{group.to}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-3">
                          {slots.map((slot) => {
                            const isPastSlot = isPastSlotTime(selectedDay.date, slot.time, currentDate, currentMinutes);
                            const isSelected = !isPastSlot && selectedStartTime === slot.time;
                            const isShortFree = !isPastSlot && slot.available && slot.canStartBooking === false;
                            const isBookable = !isPastSlot && slot.available && !isShortFree;

                            return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => {
                                if (isBookable) {
                                  setSelectedStartTime((currentTime) => (currentTime === slot.time ? '' : slot.time));
                                }
                              }}
                              disabled={!isBookable}
                              aria-disabled={!isBookable}
                              className={`group relative flex min-h-[60px] flex-col items-center rounded-lg border px-2.5 py-2.5 transition duration-300 ease-out sm:min-h-[64px] sm:px-4 ${
                                isSelected
                                  ? '-translate-y-0.5 border-[#d6a15f] bg-[#d6a15f] text-[#15110d] shadow-[0_14px_34px_rgba(214,161,95,0.18)]'
                                  : isPastSlot
                                  ? 'pointer-events-none border-[#d6a15f]/12 bg-[#16110d]/24 text-[#50483f] opacity-55'
                                  : isBookable
                                  ? 'border-[#d6a15f]/75 bg-[#d6a15f]/13 text-[#f4eee4] hover:-translate-y-0.5 hover:bg-[#d6a15f] hover:text-[#15110d]'
                                  : isShortFree
                                  ? 'pointer-events-none border-[#d6a15f]/55 bg-[#2c241c]/78 text-[#b9a58a]'
                                  : slot.status === 'cleaning'
                                  ? 'pointer-events-none border-[#d6a15f]/35 bg-[#6b4523]/28 text-[#9f8d78]'
                                  : 'pointer-events-none border-[#d6a15f]/24 bg-[#17110c]/48 text-[#6f655b]'
                              }`}
                            >
                              <span className="block text-[18px] font-extrabold leading-none sm:text-[20px]">
                                {slot.time}
                              </span>
                              {!isPastSlot && (
                                <span
                                  className={`schedule-slot-status${isBookable && !isSelected ? ' schedule-slot-status--free' : ''} mt-2 block w-full text-center text-[13px] font-extrabold uppercase tracking-[0.04em] sm:text-[12px] sm:tracking-[0.06em]`}
                                >
                                  {isSelected ? 'выбрано' : isBookable ? 'свободно' : isShortFree ? 'недоступно' : slot.status === 'cleaning' ? 'уборка' : 'занято'}
                                </span>
                              )}
                            </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </motion.div>
          {calendarNote ? (
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="schedule-calendar-note mx-auto mt-5 flex min-h-[62px] w-fit max-w-full items-center justify-center rounded-lg border border-[#d6a15f]/45 bg-[#15110d] px-6 py-4 text-center text-[20px] font-extrabold leading-8 text-[#f4eee4] shadow-[0_14px_38px_rgba(0,0,0,0.18)] sm:min-h-[70px] sm:px-8 sm:py-4 sm:text-[23px]"
            >
              {calendarNote}
            </motion.p>
          ) : null}
      </div>
    </section>
  );
}
