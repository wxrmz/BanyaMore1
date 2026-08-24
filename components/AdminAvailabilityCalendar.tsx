'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { ArrowIcon } from './ArrowIcon';

type CalendarSlot = {
  time: string;
  available: boolean;
  status?: 'free' | 'busy' | 'cleaning';
};

type CalendarDay = {
  date: string;
  slots: CalendarSlot[];
};

type CalendarBath = {
  id: string;
  title: string;
  days: CalendarDay[];
};

type AvailabilityResponse = {
  ok: boolean;
  generatedAt?: string;
  baths?: CalendarBath[];
  message?: string;
};

type DayLoad = {
  date: string;
  busy: number;
  free: number;
  cleaning: number;
  occupancy: number;
};

type ReadOnlySlot = {
  time: string;
  status: 'free' | 'busy' | 'cleaning' | 'past';
  freeBathNames: string[];
};

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const SLOT_GROUPS = [
  { id: 'night', title: 'Ночь', from: '00:00', to: '05:30' },
  { id: 'morning', title: 'Утро', from: '06:00', to: '11:30' },
  { id: 'day', title: 'День', from: '12:00', to: '17:30' },
  { id: 'evening', title: 'Вечер', from: '18:00', to: '23:30' },
];
const FULL_DAY_TIMES = Array.from({ length: 48 }, (_, index) => {
  const minutes = index * 30;
  return `${`${Math.floor(minutes / 60)}`.padStart(2, '0')}:${`${minutes % 60}`.padStart(2, '0')}`;
});
const HOURS_FORMATTER = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

const formatHours = (halfHourSlots: number) => HOURS_FORMATTER.format(halfHourSlots / 2);

const localDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const monthStartFor = (date: string) => `${date.slice(0, 7)}-01`;

const shiftMonth = (date: string, amount: number) => {
  const [year, month] = date.split('-').map(Number);
  const next = new Date(year, month - 1 + amount, 1);
  return `${next.getFullYear()}-${`${next.getMonth() + 1}`.padStart(2, '0')}-01`;
};

const monthLength = (date: string) => {
  const [year, month] = date.split('-').map(Number);
  return new Date(year, month, 0).getDate();
};

const makeMonthDates = (monthStart: string) => {
  const [year, month] = monthStart.split('-').map(Number);
  return Array.from({ length: monthLength(monthStart) }, (_, index) => {
    const day = `${index + 1}`.padStart(2, '0');
    return `${year}-${`${month}`.padStart(2, '0')}-${day}`;
  });
};

const monthTitle = (monthStart: string) => {
  const [year, month] = monthStart.split('-').map(Number);
  const value = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const shortDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(year, month - 1, day));
};

const longDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const loadTone = (occupancy: number) => {
  if (occupancy >= 90) {
    return { label: 'Почти занято', bar: '#d56755', text: 'text-[#ef9b8d]', border: 'border-[#d56755]/45' };
  }

  if (occupancy >= 70) {
    return { label: 'Плотная запись', bar: '#d98a4a', text: 'text-[#e9a66e]', border: 'border-[#d98a4a]/45' };
  }

  if (occupancy >= 40) {
    return { label: 'Средняя загрузка', bar: '#d6a15f', text: 'text-[#d6a15f]', border: 'border-[#d6a15f]/45' };
  }

  return { label: 'Много свободного', bar: '#78a978', text: 'text-[#9bc29b]', border: 'border-[#78a978]/45' };
};

export default function AdminAvailabilityCalendar() {
  const today = useMemo(localDate, []);
  const currentMonth = useMemo(() => monthStartFor(today), [today]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [baths, setBaths] = useState<CalendarBath[]>([]);
  const [selectedBathId, setSelectedBathId] = useState('all');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [generatedAt, setGeneratedAt] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');

  const dates = useMemo(() => makeMonthDates(selectedMonth), [selectedMonth]);
  const leadingDays = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return (new Date(year, month - 1, 1).getDay() + 6) % 7;
  }, [selectedMonth]);

  useEffect(() => {
    let ignore = false;

    async function loadMonth() {
      setStatus('loading');
      setMessage('');

      const requestFrom = selectedMonth === currentMonth ? today : selectedMonth;
      const requestedDays = monthLength(selectedMonth) - Number(requestFrom.slice(8, 10)) + 1;

      try {
        const response = await fetch(`/api/yclients/availability?from=${requestFrom}&days=${requestedDays}`, {
          cache: 'no-store',
        });
        const payload = (await response.json()) as AvailabilityResponse;

        if (ignore) {
          return;
        }

        if (!response.ok || !payload.ok || !payload.baths?.length) {
          throw new Error(payload.message || 'Не удалось загрузить расписание.');
        }

        setBaths(payload.baths);
        setGeneratedAt(payload.generatedAt || new Date().toISOString());
        setSelectedBathId((current) => (current === 'all' || payload.baths?.some((bath) => bath.id === current) ? current : 'all'));
        setStatus('ready');
      } catch (error) {
        if (!ignore) {
          setBaths([]);
          setStatus('error');
          setMessage(error instanceof Error ? error.message : 'Не удалось загрузить расписание.');
        }
      }
    }

    loadMonth();

    return () => {
      ignore = true;
    };
  }, [currentMonth, reloadKey, selectedMonth, today]);

  useEffect(() => {
    setSelectedDate('');
  }, [selectedMonth]);

  const selectedBaths = useMemo(
    () => (selectedBathId === 'all' ? baths : baths.filter((bath) => bath.id === selectedBathId)),
    [baths, selectedBathId],
  );

  const selectedDaySlots = useMemo<ReadOnlySlot[]>(() => {
    if (!selectedDate || !selectedBaths.length) {
      return [];
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return FULL_DAY_TIMES.map((time) => {
      const bathSlots = selectedBaths.map((bath) => ({
        bath,
        slot: bath.days.find((day) => day.date === selectedDate)?.slots.find((slot) => slot.time === time),
      }));
      const freeBaths = bathSlots.filter(({ slot }) => slot?.available || slot?.status === 'free');
      const cleaningBaths = bathSlots.filter(({ slot }) => slot?.status === 'cleaning');
      const isPast = selectedDate === today && timeToMinutes(time) < currentMinutes;

      return {
        time,
        status: isPast ? 'past' : freeBaths.length > 0 ? 'free' : cleaningBaths.length > 0 ? 'cleaning' : 'busy',
        freeBathNames: freeBaths.map(({ bath }) => bath.title),
      };
    });
  }, [selectedBaths, selectedDate, today]);

  const dayLoads = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return dates.map<DayLoad | null>((date) => {
      if (date < today || !selectedBaths.length) {
        return null;
      }

      let busy = 0;
      let free = 0;
      let cleaning = 0;

      selectedBaths.forEach((bath) => {
        const day = bath.days.find((item) => item.date === date);

        day?.slots.forEach((slot) => {
          if (date === today && timeToMinutes(slot.time) < currentMinutes) {
            return;
          }

          if (slot.status === 'cleaning') {
            cleaning += 1;
          } else if (slot.available || slot.status === 'free') {
            free += 1;
          } else {
            busy += 1;
          }
        });
      });

      const capacity = busy + free;

      if (!capacity) {
        return null;
      }

      return {
        date,
        busy,
        free,
        cleaning,
        occupancy: Math.round((busy / capacity) * 100),
      };
    });
  }, [dates, selectedBaths, today]);

  const loadByDate = useMemo(
    () => new Map(dayLoads.filter((item): item is DayLoad => Boolean(item)).map((item) => [item.date, item])),
    [dayLoads],
  );
  const validLoads = useMemo(() => dayLoads.filter((item): item is DayLoad => Boolean(item)), [dayLoads]);
  const totalBusy = validLoads.reduce((sum, item) => sum + item.busy, 0);
  const totalFree = validLoads.reduce((sum, item) => sum + item.free, 0);
  const monthOccupancy = totalBusy + totalFree ? Math.round((totalBusy / (totalBusy + totalFree)) * 100) : 0;
  const busiestDay = validLoads.reduce<DayLoad | null>((current, item) => (!current || item.occupancy > current.occupancy ? item : current), null);
  const canGoBack = selectedMonth > currentMonth;

  return (
    <section className="rounded-xl border border-[#d6a15f]/35 bg-[#15110d] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:p-6 lg:p-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[15px] font-extrabold uppercase tracking-[0.18em] text-[#d6a15f] sm:text-[17px]">Загрузка календаря</p>
          <h2 className="mt-3 font-sans text-[34px] font-extrabold text-[#f4eee4] sm:text-[44px]">{monthTitle(selectedMonth)}</h2>
          <p className="mt-4 max-w-3xl text-[16px] font-semibold leading-7 text-[#8f857a] sm:text-[18px] sm:leading-8">
            Занятость рассчитана по получасовым интервалам онлайн-записи, значения показаны в часах. Уборка не входит в процент загрузки.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-label="Предыдущий месяц"
            disabled={!canGoBack || status === 'loading'}
            onClick={() => canGoBack && setSelectedMonth((month) => shiftMonth(month, -1))}
            className="grid h-16 w-16 place-items-center rounded-xl border border-[#d6a15f]/40 text-[#d6a15f] transition hover:border-[#d6a15f] hover:bg-[#d6a15f] hover:text-[#15110d] disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowIcon direction="left" tight className="h-10 w-10" />
          </button>
          <div
            aria-live="polite"
            className="flex h-16 min-w-[220px] items-center justify-center rounded-xl border border-[#d6a15f]/40 bg-[#0f0c09] px-8 text-[20px] font-extrabold uppercase tracking-[0.08em] text-[#f4eee4]"
          >
            {monthTitle(selectedMonth).replace(' г.', '')}
          </div>
          <button
            type="button"
            aria-label="Следующий месяц"
            disabled={status === 'loading'}
            onClick={() => setSelectedMonth((month) => shiftMonth(month, 1))}
            className="grid h-16 w-16 place-items-center rounded-xl border border-[#d6a15f]/40 text-[#d6a15f] transition hover:border-[#d6a15f] hover:bg-[#d6a15f] hover:text-[#15110d] disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowIcon tight className="h-10 w-10" />
          </button>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setSelectedBathId('all')}
          className={`inline-flex min-h-[54px] items-center justify-center rounded-xl border px-6 py-3 text-[14px] font-extrabold uppercase tracking-[0.08em] transition sm:text-[16px] ${
            selectedBathId === 'all'
              ? 'border-[#d6a15f] bg-[#d6a15f] text-[#15110d]'
              : 'border-[#d6a15f]/35 text-[#b9aea0] hover:border-[#d6a15f]/70'
          }`}
        >
          Все бани
        </button>
        {baths.map((bath) => (
          <button
            key={bath.id}
            type="button"
            onClick={() => setSelectedBathId(bath.id)}
            className={`inline-flex min-h-[54px] items-center justify-center rounded-xl border px-6 py-3 text-[14px] font-extrabold uppercase tracking-[0.08em] transition sm:text-[16px] ${
              selectedBathId === bath.id
                ? 'border-[#d6a15f] bg-[#d6a15f] text-[#15110d]'
                : 'border-[#d6a15f]/35 text-[#b9aea0] hover:border-[#d6a15f]/70'
            }`}
          >
            {bath.title}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[#d6a15f]/25 bg-[#0f0c09] p-4">
          <div className="text-[13px] font-extrabold uppercase tracking-[0.11em] text-[#8f857a]">Загрузка месяца</div>
          <div className="mt-2 text-3xl font-extrabold text-[#f4eee4]">{status === 'ready' ? `${monthOccupancy}%` : '—'}</div>
        </div>
        <div className="rounded-lg border border-[#d6a15f]/25 bg-[#0f0c09] p-4">
          <div className="text-[13px] font-extrabold uppercase tracking-[0.11em] text-[#8f857a]">Самый плотный день</div>
          <div className="mt-2 text-2xl font-extrabold text-[#f4eee4]">
            {status === 'ready' && busiestDay ? `${shortDate(busiestDay.date)} · ${busiestDay.occupancy}%` : '—'}
          </div>
        </div>
        <div className="rounded-lg border border-[#d6a15f]/25 bg-[#0f0c09] p-4">
          <div className="text-[13px] font-extrabold uppercase tracking-[0.11em] text-[#8f857a]">Свободных часов</div>
          <div className="mt-2 text-3xl font-extrabold text-[#f4eee4]">{status === 'ready' ? `${formatHours(totalFree)} ч` : '—'}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-[16px] font-bold text-[#b9aea0]">
        {[
          ['#78a978', '0–39%'],
          ['#d6a15f', '40–69%'],
          ['#d98a4a', '70–89%'],
          ['#d56755', '90–100%'],
        ].map(([color, label]) => (
          <span key={label} className="inline-flex items-center gap-3">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      {status === 'error' ? (
        <div className="mt-6 rounded-lg border border-[#d56755]/35 bg-[#2a1511] px-5 py-6 text-center">
          <p className="font-bold text-[#ef9b8d]">{message}</p>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="mt-4 rounded-lg border border-[#d6a15f]/50 px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#f4eee4]"
          >
            Повторить
          </button>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto pb-2">
          <div className="min-w-[840px]">
            <div className="grid grid-cols-7 gap-2">
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} className="px-2 py-4 text-center text-[16px] font-extrabold uppercase tracking-[0.14em] text-[#8f857a]">
                  {weekday}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: leadingDays }, (_, index) => (
                <div key={`empty-${index}`} aria-hidden="true" />
              ))}

              {dates.map((date, index) => {
                const load = loadByDate.get(date);
                const isPast = date < today;
                const tone = load ? loadTone(load.occupancy) : null;

                return (
                  <button
                    key={date}
                    type="button"
                    disabled={isPast || !load || status !== 'ready'}
                    aria-pressed={selectedDate === date}
                    onClick={() => setSelectedDate((current) => (current === date ? '' : date))}
                    className={`min-h-[154px] w-full rounded-lg border p-3 text-left transition ${
                      isPast
                        ? 'border-[#d6a15f]/12 bg-[#0c0a08]/55 text-[#5f574f]'
                        : tone
                          ? `${tone.border} bg-[#0f0c09] hover:-translate-y-0.5 hover:border-[#d6a15f]/80`
                          : 'border-[#d6a15f]/20 bg-[#0f0c09]'
                    } ${selectedDate === date ? 'ring-2 ring-[#d6a15f] ring-offset-2 ring-offset-[#15110d]' : ''} disabled:pointer-events-none`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[28px] font-extrabold leading-none ${isPast ? 'text-[#5f574f]' : 'text-[#f4eee4]'}`}>{index + 1}</span>
                      {load && <span className={`text-[18px] font-extrabold leading-none ${tone?.text}`}>{load.occupancy}%</span>}
                    </div>

                    {isPast ? (
                      <div className="mt-8 text-[14px] font-bold uppercase tracking-[0.08em]">День прошёл</div>
                    ) : status === 'loading' ? (
                      <div className="mt-5 space-y-3 animate-pulse">
                        <div className="h-2 rounded-full bg-[#d6a15f]/12" />
                        <div className="h-3 w-2/3 rounded bg-[#d6a15f]/10" />
                      </div>
                    ) : load && tone ? (
                      <>
                        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#2b241d]">
                          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${load.occupancy}%`, backgroundColor: tone.bar }} />
                        </div>
                        <div className={`mt-3 text-[11px] font-extrabold uppercase tracking-[0.06em] ${tone.text}`}>{tone.label}</div>
                        <div className="mt-2 text-[14px] font-semibold leading-6 text-[#8f857a]">
                          Свободно: {formatHours(load.free)} ч<br />Занято: {formatHours(load.busy)} ч
                          {load.cleaning > 0 && <><br />Уборка: {formatHours(load.cleaning)} ч</>}
                        </div>
                      </>
                    ) : (
                      <div className="mt-8 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8f857a]">Нет данных</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {selectedDate && selectedDaySlots.length > 0 && (
          <motion.div
            key={selectedDate}
            initial={{ height: 0, opacity: 0, y: 24, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, y: 0, marginTop: 24 }}
            exit={{ height: 0, opacity: 0, y: 18, marginTop: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-[#d6a15f]/45 bg-[#0f0c09] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#d6a15f]">Окна выбранного дня</p>
                  <h3 className="mt-2 text-2xl font-extrabold text-[#f4eee4] sm:text-3xl">{longDate(selectedDate)}</h3>
                  <p className="mt-2 text-sm font-semibold text-[#8f857a]">
                    {selectedBathId === 'all' ? 'Все бани' : selectedBaths[0]?.title} · только просмотр
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  aria-label="Закрыть расписание дня"
                  className="grid h-12 w-12 shrink-0 place-items-center self-end rounded-lg border border-[#d6a15f]/35 text-[30px] font-bold leading-none text-[#f4eee4] transition hover:border-[#d6a15f] hover:bg-[#d6a15f] hover:text-[#15110d] sm:self-start"
                >
                  <span className="-translate-y-0.5">×</span>
                </button>
              </div>

              <div className="mt-6 grid gap-7 xl:grid-cols-4">
                {SLOT_GROUPS.map((group) => {
                  const groupSlots = selectedDaySlots.filter((slot) => slot.time >= group.from && slot.time <= group.to);

                  return (
                    <div key={group.id}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-xl font-extrabold text-[#f4eee4]">{group.title}</h4>
                        <span className="text-[13px] font-extrabold tracking-[0.06em] text-[#bfa06d]">{group.from}–{group.to}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-3">
                        {groupSlots.map((slot) => {
                          const statusLabel =
                            slot.status === 'past'
                              ? 'прошло'
                              : slot.status === 'free'
                                ? 'свободно'
                                : slot.status === 'cleaning'
                                  ? 'уборка'
                                  : 'занято';
                          const toneClass =
                            slot.status === 'free'
                              ? 'border-[#78a978]/55 bg-[#17301d]/45 text-[#b9d9b9]'
                              : slot.status === 'cleaning'
                                ? 'border-[#d98a4a]/45 bg-[#4a2c16]/35 text-[#e9a66e]'
                                : slot.status === 'past'
                                  ? 'border-[#d6a15f]/12 bg-[#0c0a08]/55 text-[#5f574f]'
                                  : 'border-[#d6a15f]/20 bg-[#17110c]/60 text-[#756b61]';

                          return (
                            <div
                              key={slot.time}
                              title={slot.freeBathNames.length ? `Свободны: ${slot.freeBathNames.join(', ')}` : undefined}
                              className={`flex min-h-[66px] flex-col items-center justify-center rounded-lg border px-2 py-2 text-center ${toneClass}`}
                            >
                              <span className="text-[18px] font-extrabold leading-none">{slot.time}</span>
                              <span className="mt-2 text-[10px] font-extrabold uppercase leading-tight tracking-[0.04em]">{statusLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 text-right text-[11px] font-semibold text-[#6f655b]">
        {generatedAt && status === 'ready'
          ? `Обновлено ${new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(generatedAt))}`
          : 'Данные обновляются'}
      </div>
    </section>
  );
}
