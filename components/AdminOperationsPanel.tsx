'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { AvailabilityBath, buildFreeWindowsFromAvailability } from '@/lib/availabilityCopyText';

type DailyReport = {
  date: string;
  income: number;
  expense: number;
  prepayments: number;
  cashless: number;
  terminal: number;
  surrendered: number;
  transactionCount: number;
  expenses: Array<{ title: string; amount: number }>;
  checks: Array<{ denomination: number; quantity: number; total: number }>;
  unclassifiedChecks: number;
};
type CatalogService = { id: number; title: string; price: number };
type BathRecord = {
  id: number;
  date: string;
  start: string;
  end: string;
  state: 'past' | 'current' | 'future';
  durationMinutes: number;
  client: { name: string; phone: string; email: string };
  services: Array<CatalogService & { discount: number; amount: number; isKitchen: boolean }>;
  total: number;
  comment: string;
  attendance: number;
  prepaid: boolean;
  paidFull: boolean;
};
type BathSummary = {
  id: string;
  title: string;
  shortTitle: string;
  revenue: number;
  prepayments: number;
  kitchenRevenue: number;
  kitchenOrders: Array<{ title: string; quantity: number }>;
  kppChecks: number;
  discounts: number;
  records: BathRecord[];
};
type SalesRow = {
  id: number;
  title: string;
  unitPrice: number;
  quantity: number;
  revenue: number;
  stock: number | null;
  stockUnit: string;
};
type ConsumableRow = {
  id: number;
  title: string;
  group: string;
  used: number;
  usedUnit: string;
  stock: number | null;
  stockUnit: string;
};
type DashboardResponse = {
  ok: boolean;
  date?: string;
  range?: { from: string; to: string };
  report?: DailyReport;
  baths?: BathSummary[];
  kitchen?: { sold: SalesRow[]; consumables: ConsumableRow[] };
  additionalServices?: SalesRow[];
  goods?: SalesRow[];
  beer?: SalesRow[];
  drinks?: SalesRow[];
  copyText?: { freeWindows: string; occupiedTimes: string; occupiedBaths: string };
  generatedAt?: string;
  message?: string;
};
type AvailabilityResponse = { ok: boolean; baths?: AvailabilityBath[] };
export type AdminCopyData = {
  selectedDate: string;
  copyText: { freeWindows: string; occupiedTimes: string; occupiedBaths: string };
};

const localDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
const quantity = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const formatMoney = (value: number) => money.format(value || 0);
const formatQuantity = (value: number, unit = '') => `${quantity.format(value || 0)}${unit ? ` ${unit}` : ''}`;
const durationLabel = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} мин`;
  return remainder ? `${hours} ч ${remainder} мин` : `${hours} ч`;
};
const attendanceLabel = (value: number) => {
  if (value === 1) return 'Пришёл';
  if (value === 2) return 'Подтвердил';
  if (value === -1) return 'Не пришёл';
  return 'Ожидается';
};
const formatProductTitle = (value: string) => value.trim().replace(/(\b0[,.]0)\s*$/, '$1%');
const formatStockQuantity = (value: number, unit = '') => {
  const normalizedUnit = unit.trim().toLocaleLowerCase('ru-RU').replaceAll('.', '');
  const absolute = Math.abs(value);

  if (absolute >= 1000 && ['г', 'гр', 'грамм', 'граммов'].includes(normalizedUnit)) {
    return formatQuantity(value / 1000, 'кг');
  }

  if (absolute >= 1000 && ['мл', 'миллилитр', 'миллилитров'].includes(normalizedUnit)) {
    return formatQuantity(value / 1000, 'л');
  }

  return formatQuantity(value, unit);
};
const dateLabel = (value: string) => new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Vladivostok',
}).format(new Date(`${value}T00:00:00+10:00`));

const panelClass = 'rounded-lg border border-[#d6a15f]/35 bg-[#15110d] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-7';
const tableHeadClass = 'bg-[#201912] text-left text-xs font-extrabold uppercase tracking-[0.08em] text-[#b9aea0]';
const tableCellClass = 'border-t border-[#d6a15f]/15 px-4 py-3 text-sm font-semibold text-[#ded3c5]';

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className={panelClass}>
      <p className="text-lg font-extrabold uppercase tracking-[0.18em] text-[#d6a15f]">{eyebrow}</p>
      <h2 className="mt-2 text-[32px] font-extrabold text-[#f4eee4]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({ text, prominent = false }: { text: string; prominent?: boolean }) {
  return (
    <div className={`rounded-lg border border-dashed border-[#d6a15f]/30 px-4 py-8 text-center text-[#81776d] ${prominent ? 'text-lg font-extrabold sm:text-xl' : 'text-sm font-semibold'}`}>
      {text}
    </div>
  );
}

const calendarMonths = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const calendarWeekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const parseIsoDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month: month - 1, day };
};

const isoDate = (year: number, month: number, day: number) =>
  `${year}-${`${month + 1}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`;

const shortDate = (value: string) => {
  const { year, month, day } = parseIsoDate(value);
  return `${`${day}`.padStart(2, '0')}.${`${month + 1}`.padStart(2, '0')}.${year}`;
};

function ThemedDatePicker({
  value,
  onChange,
  embedded = false,
  showIcon = true,
  popoverAlign = 'left',
  ariaLabel = 'Выбрать день для итогов и бань',
}: {
  value: string;
  onChange: (value: string) => void;
  embedded?: boolean;
  showIcon?: boolean;
  popoverAlign?: 'left' | 'right';
  ariaLabel?: string;
}) {
  const selected = useMemo(() => parseIsoDate(value), [value]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: selected.year, month: selected.month });
  const rootRef = useRef<HTMLDivElement>(null);
  const todayValue = useMemo(localDate, []);

  useEffect(() => {
    if (!open) setView({ year: selected.year, month: selected.month });
  }, [open, selected.month, selected.year]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const days = useMemo(() => {
    const leadingDays = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const cellCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
    return Array.from({ length: cellCount }, (_, index) => {
      const day = index - leadingDays + 1;
      return day > 0 && day <= daysInMonth ? day : null;
    });
  }, [view]);

  const changeMonth = (offset: number) => {
    setView((current) => {
      const date = new Date(current.year, current.month + offset, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  const chooseDate = (day: number) => {
    onChange(isoDate(view.year, view.month, day));
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={embedded ? `relative min-w-0 flex-1 ${showIcon ? 'sm:w-[224px] sm:flex-none' : ''}` : 'relative'}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex min-h-[56px] w-full cursor-pointer items-center bg-[#0f0c09] text-left text-2xl font-extrabold text-[#f4eee4] outline-none transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] focus:bg-[#d6a15f]/5 ${
          embedded
            ? 'rounded-lg px-3 hover:bg-[#d6a15f]/5'
            : 'rounded-lg border border-[#d6a15f]/35 px-5 hover:border-[#d6a15f]/70 hover:shadow-[0_8px_24px_rgba(214,161,95,0.08)] focus:border-[#d6a15f] sm:w-[265px]'
        }`}
      >
        {showIcon && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" className={`${embedded ? 'mr-3' : 'mr-5'} h-9 w-9 shrink-0 text-[#d6a15f]`} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3m10-3v3M4.5 9.5h15M6.5 5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          </svg>
        )}
        <span>{shortDate(value)}</span>
      </button>

        <div
          aria-hidden={!open}
          className={`absolute top-full z-50 mt-3 w-[330px] origin-top rounded-xl border border-[#d6a15f]/55 bg-[#15110d] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.7)] transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${popoverAlign === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'} ${open ? 'visible translate-y-0 scale-100 opacity-100' : 'invisible pointer-events-none -translate-y-2 scale-[0.97] opacity-0'}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <button type="button" aria-label="Предыдущий месяц" onClick={() => changeMonth(-1)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d6a15f]/30 text-[#d6a15f] transition hover:border-[#d6a15f] hover:bg-[#d6a15f]/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" /></svg>
            </button>
            <div className="text-center">
              <div className="text-lg font-extrabold text-[#f4eee4]">{calendarMonths[view.month]}</div>
              <div className="text-xs font-extrabold tracking-[0.14em] text-[#d6a15f]">{view.year}</div>
            </div>
            <button type="button" aria-label="Следующий месяц" onClick={() => changeMonth(1)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d6a15f]/30 text-[#d6a15f] transition hover:border-[#d6a15f] hover:bg-[#d6a15f]/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarWeekdays.map((weekday) => (
              <div key={weekday} className="pb-2 text-center text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#8f857a]">{weekday}</div>
            ))}
            {days.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} className="h-9" />;
              const cellValue = isoDate(view.year, view.month, day);
              const isSelected = cellValue === value;
              const isToday = cellValue === todayValue;
              return (
                <button
                  key={cellValue}
                  type="button"
                  aria-label={dateLabel(cellValue)}
                  aria-pressed={isSelected}
                  onClick={() => chooseDate(day)}
                  className={`h-9 rounded-md text-sm font-extrabold transition ${
                    isSelected
                      ? 'bg-[#d6a15f] text-[#15110d] shadow-[0_0_0_1px_rgba(214,161,95,0.4)]'
                      : isToday
                        ? 'border border-[#d6a15f]/70 text-[#f0b45e] hover:bg-[#d6a15f]/10'
                        : 'text-[#ded3c5] hover:bg-[#d6a15f]/15 hover:text-[#f4eee4]'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              onChange(todayValue);
              setOpen(false);
            }}
            className="mt-4 w-full rounded-lg border border-[#d6a15f]/30 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#d6a15f] transition hover:border-[#d6a15f] hover:bg-[#d6a15f]/10"
          >
            Сегодня
          </button>
        </div>
    </div>
  );
}

function StockValue({ value, unit }: { value: number | null; unit: string }) {
  if (value === null) return <>—</>;
  if (value < 0) {
    return (
      <span
        className="font-extrabold text-[#e9a66e]"
        title="Складской учёт в YCLIENTS не сверен: API возвращает отрицательный остаток"
      >
        Учёт не сверен: −{formatStockQuantity(Math.abs(value), unit)}
      </span>
    );
  }
  return <>{formatStockQuantity(value, unit)}</>;
}

function SalesTable({ rows, firstColumn, showStock = true }: { rows: SalesRow[]; firstColumn: string; showStock?: boolean }) {
  if (!rows.length) return <EmptyState text="За выбранный диапазон данных нет." />;
  return (
    <div className="overflow-x-auto rounded-lg border border-[#d6a15f]/25">
      <table className="w-full min-w-[700px] border-collapse">
        <thead className={tableHeadClass} style={{ fontSize: '16px' }}>
          <tr>
            <th className="px-4 py-3">{firstColumn}</th>
            <th className="px-4 py-3 text-right">Стоимость</th>
            <th className="px-4 py-3 text-right">Продано</th>
            <th className="px-4 py-3 text-right">Выручка</th>
            {showStock && <th className="px-4 py-3 text-right">Остаток</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="bg-[#0f0c09] transition hover:bg-[#18120d]">
              <td className={`${tableCellClass} font-bold text-[#f4eee4]`} style={{ fontSize: '18px', lineHeight: 1.25 }}>{formatProductTitle(row.title)}</td>
              <td className={`${tableCellClass} text-right`} style={{ fontSize: '18px', lineHeight: 1.25 }}>{formatMoney(row.unitPrice)}</td>
              <td className={`${tableCellClass} text-right`} style={{ fontSize: '18px', lineHeight: 1.25 }}>{formatQuantity(row.quantity)}</td>
              <td className={`${tableCellClass} text-right font-extrabold text-[#f4eee4]`} style={{ fontSize: '18px', lineHeight: 1.25 }}>{formatMoney(row.revenue)}</td>
              {showStock && <td className={`${tableCellClass} text-right`} style={{ fontSize: '18px', lineHeight: 1.25 }}><StockValue value={row.stock} unit={row.stockUnit} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConsumablesTable({ rows }: { rows: ConsumableRow[] }) {
  if (!rows.length) return <EmptyState text="Списания расходников за выбранный диапазон не найдены." />;
  let previousGroup = '';
  return (
    <div className="overflow-x-auto rounded-lg border border-[#d6a15f]/25">
      <table className="w-full min-w-[620px] border-collapse">
        <thead className={tableHeadClass} style={{ fontSize: '16px' }}>
          <tr><th className="px-4 py-3">Расходник</th><th className="px-4 py-3 text-right">Использовано</th><th className="px-4 py-3 text-right">Остаток на складе</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const showGroup = row.group !== previousGroup;
            previousGroup = row.group;
            return [
              showGroup ? (
                <tr key={`group-${row.group}`} className="bg-[#d6a15f]/10">
                  <th colSpan={3} className="border-t border-[#d6a15f]/25 px-4 py-3 text-left font-extrabold uppercase tracking-[0.08em] text-[#d6a15f]" style={{ fontSize: '16px' }}>{row.group}</th>
                </tr>
              ) : null,
              <tr key={row.id} className="bg-[#0f0c09] transition hover:bg-[#18120d]">
                <td className={`${tableCellClass} font-bold text-[#f4eee4]`} style={{ fontSize: '18px', lineHeight: 1.25 }}>{row.title}</td>
                <td className={`${tableCellClass} text-right`} style={{ fontSize: '18px', lineHeight: 1.25 }}>{formatQuantity(row.used, row.usedUnit)}</td>
                <td className={`${tableCellClass} text-right`} style={{ fontSize: '18px', lineHeight: 1.25 }}><StockValue value={row.stock} unit={row.stockUnit} /></td>
              </tr>,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

function CopyCard({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  return (
    <article className="flex min-h-full flex-col rounded-lg border border-[#d6a15f]/25 bg-[#0f0c09] p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-extrabold text-[#f4eee4]">{title}</h3>
        <button type="button" onClick={copy} disabled={!text} className="shrink-0 rounded-lg border border-[#d6a15f]/45 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#d6a15f] transition hover:bg-[#d6a15f]/10 disabled:opacity-40">
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>
      <pre className="mt-4 flex-1 whitespace-pre-wrap font-sans text-sm font-semibold leading-6 text-[#b9aea0]">{text || 'Нет записей на выбранный день.'}</pre>
    </article>
  );
}

export function AdminCopyTextsPanel({ data }: { data: AdminCopyData | null }) {
  if (!data) return null;
  return (
    <Section eyebrow="Тексты для копирования" title={`Расписание на ${dateLabel(data.selectedDate)}`}>
      <div className="grid gap-4 xl:grid-cols-3">
        <CopyCard title="Свободные окна по баням" text={data.copyText.freeWindows} />
        <CopyCard title="Все занятые времена" text={data.copyText.occupiedTimes} />
        <CopyCard title="Занятые бани с подписями" text={data.copyText.occupiedBaths} />
      </div>
    </Section>
  );
}

function DetailedBathRecordCard({
  record,
  period,
  kitchenTitles,
}: {
  record: BathRecord;
  period: boolean;
  kitchenTitles: Set<string>;
}) {
  const selectedServices = record.services.filter((service) => !service.isKitchen && !kitchenTitles.has(service.title.trim().toLocaleLowerCase('ru-RU')));
  const kitchenServices = record.services.filter((service) => service.isKitchen || kitchenTitles.has(service.title.trim().toLocaleLowerCase('ru-RU')));
  const kitchenTotal = kitchenServices.reduce((sum, service) => sum + service.price * service.amount, 0);
  return (
    <article className="flex flex-1 flex-col rounded-lg border border-[#d6a15f]/25 bg-[#15110d] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-extrabold uppercase tracking-[0.12em] text-[#d6a15f]">
            {period ? `${shortDate(record.date)} · ` : ''}{record.start}–{record.end}
          </div>
          <h4 className="mt-1 text-2xl font-extrabold text-[#f4eee4]">{record.client.name}</h4>
          <div className="mt-1 text-lg font-semibold text-[#b9aea0]">
            {record.client.phone || 'Телефон не указан'}
            {record.client.email ? ` · ${record.client.email}` : ''}
          </div>
        </div>
        <div className="rounded-full border border-[#d6a15f]/30 px-3 py-1 text-base font-bold text-[#b9aea0]">
          {attendanceLabel(record.attendance)}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-lg">
        <div className="rounded-lg bg-[#0f0c09] px-3 py-2">
          <div className="text-base font-bold uppercase tracking-[0.1em] text-[#81776d]">Длительность</div>
          <div className="mt-1 font-extrabold text-[#f4eee4]">{durationLabel(record.durationMinutes)}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-base font-extrabold uppercase tracking-[0.12em] text-[#b9aea0]">Выбранные услуги</div>
        <div className="mt-2 space-y-3">
          {selectedServices.map((service, index) => (
            <div key={`${service.id}-${index}`} className="flex items-center justify-between gap-4 rounded-lg bg-[#0f0c09] px-4 py-3 text-lg font-semibold text-[#b9aea0]">
              <span>{service.title}</span>
              <span className="shrink-0 text-right font-extrabold text-[#f4eee4]">
                {formatQuantity(service.amount)} × {formatMoney(service.price)} = {formatMoney(service.price * service.amount)}
              </span>
            </div>
          ))}
          {kitchenTotal > 0 && (
            <div className="flex items-center justify-between gap-4 rounded-lg bg-[#0f0c09] px-4 py-3 text-lg font-semibold text-[#b9aea0]">
              <span>Кухня — общая сумма</span>
              <span className="shrink-0 font-extrabold text-[#f4eee4]">{formatMoney(kitchenTotal)}</span>
            </div>
          )}
          {!selectedServices.length && kitchenTotal <= 0 && <span className="text-lg font-semibold text-[#81776d]">Услуги не указаны</span>}
        </div>
      </div>

      {record.comment && <p className="mt-4 text-lg font-semibold leading-7 text-[#b9aea0]">Комментарий: {record.comment}</p>}

      <div className="mt-auto flex items-center justify-between gap-4 border-t border-[#d6a15f]/20 pt-4 text-lg font-extrabold">
        <span className="uppercase tracking-[0.08em] text-[#d6a15f]">Сумма услуг</span>
        <span className="text-[#f0b45e]">{formatMoney(record.total)}</span>
      </div>
    </article>
  );
}

function KitchenRecordCard({ record, period, kitchenTitles }: { record: BathRecord; period: boolean; kitchenTitles: Set<string> }) {
  const kitchenServices = record.services.filter((service) => service.isKitchen || kitchenTitles.has(service.title.trim().toLocaleLowerCase('ru-RU')));
  const kitchenTotal = kitchenServices.reduce((sum, service) => sum + service.price * service.amount, 0);

  return (
    <article className="flex flex-1 flex-col rounded-lg border border-[#d6a15f]/25 bg-[#15110d] p-4 sm:p-5">
      <div className="text-base font-extrabold uppercase tracking-[0.12em] text-[#d6a15f]">
        {period ? `${shortDate(record.date)} · ` : ''}{record.start}–{record.end}
      </div>
      <h4 className="mt-1 text-2xl font-extrabold text-[#f4eee4]">{record.client.name}</h4>

      {kitchenServices.length ? (
        <>
          <div className="mt-4 space-y-3">
            {kitchenServices.map((service, index) => (
              <div key={`${service.id}-${index}`} className="flex items-center justify-between gap-4 rounded-lg bg-[#0f0c09] px-4 py-3 text-lg font-semibold text-[#b9aea0]">
                <span>{service.title}</span>
                <span className="shrink-0 text-right font-extrabold text-[#f4eee4]">
                  {formatQuantity(service.amount)} × {formatMoney(service.price)} = {formatMoney(service.price * service.amount)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-center justify-between gap-4 border-t border-[#d6a15f]/20 pt-4 text-lg font-extrabold">
            <span className="uppercase tracking-[0.08em] text-[#d6a15f]">Итого по кухне</span>
            <span className="text-[#f0b45e]">{formatMoney(kitchenTotal)}</span>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-[#d6a15f]/25 px-4 py-8 text-center text-lg font-semibold text-[#81776d]">
          Заказов по кухне нет
        </div>
      )}
    </article>
  );
}

export default function AdminOperationsPanel({
  onUpdatedAt,
  onCopyData,
}: {
  onUpdatedAt?: (value: string) => void;
  onCopyData?: (value: AdminCopyData | null) => void;
}) {
  const today = useMemo(localDate, []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [mode, setMode] = useState<'day' | 'period'>('day');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reloadKey, setReloadKey] = useState(0);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [openBaths, setOpenBaths] = useState<Set<string>>(() => new Set());

  const rangeFrom = mode === 'day' ? selectedDate : from;
  const rangeTo = mode === 'day' ? selectedDate : to;

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      setMessage('');
      setDashboard(null);
      try {
        const query = new URLSearchParams({ date: selectedDate, from: rangeFrom, to: rangeTo });
        const [response, availabilityResponse] = await Promise.all([
          fetch(`/api/admin/yclients?${query}`, { cache: 'no-store' }),
          fetch(`/api/yclients/availability?from=${selectedDate}&days=1`, { cache: 'no-store' }).catch(() => null),
        ]);
        const payload = (await response.json()) as DashboardResponse;
        if (ignore) return;
        if (!response.ok || !payload.ok) throw new Error(payload.message || 'Не удалось загрузить данные YCLIENTS.');
        const availabilityPayload = availabilityResponse?.ok
          ? await availabilityResponse.json().catch(() => null) as AvailabilityResponse | null
          : null;
        const freeWindows = availabilityPayload?.ok && availabilityPayload.baths?.length
          ? buildFreeWindowsFromAvailability(availabilityPayload.baths, selectedDate)
          : 'Свободные окна временно недоступны';
        setDashboard({
          ...payload,
          copyText: {
            freeWindows,
            occupiedTimes: payload.copyText?.occupiedTimes ?? '',
            occupiedBaths: payload.copyText?.occupiedBaths ?? '',
          },
        });
        if (payload.generatedAt) onUpdatedAt?.(payload.generatedAt);
        setStatus('ready');
      } catch (error) {
        if (!ignore) {
          setStatus('error');
          setMessage(error instanceof Error ? error.message : 'Не удалось загрузить данные YCLIENTS.');
        }
      }
    }
    load();
    return () => { ignore = true; };
  }, [onUpdatedAt, rangeFrom, rangeTo, reloadKey, selectedDate]);

  const report = dashboard?.report;
  const reportRows = report ? [
    ['Приход', formatMoney(report.income)],
    ['Расход', formatMoney(report.expense)],
    ['Предоплаты', formatMoney(report.prepayments)],
    ['Безналичная оплата', `${formatMoney(report.cashless)} (${formatMoney(report.terminal)})`],
    ['Сдал', formatMoney(report.surrendered)],
  ] : [];
  const expenseRows = report?.expenses.filter((row) => !(row.title.toLocaleLowerCase('ru-RU').includes('кпп') && /чек/i.test(row.title))) ?? [];
  const checksTotal = report
    ? (report.checks ?? []).reduce((sum, row) => sum + row.total, 0) + (report.unclassifiedChecks ?? 0)
    : 0;
  const isPeriodReport = mode === 'period' && rangeFrom !== rangeTo;
  const reportTitle = isPeriodReport
    ? `Отчёт за период ${shortDate(rangeFrom)} — ${shortDate(rangeTo)}`
    : `Отчёт за ${dateLabel(report?.date ?? rangeFrom)}`;

  useEffect(() => {
    const copyText = dashboard?.copyText;
    onCopyData?.(copyText ? { selectedDate, copyText } : null);
  }, [dashboard?.copyText, onCopyData, selectedDate]);

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[15px] font-extrabold uppercase tracking-[0.18em] text-[#d6a15f] sm:text-base">YCLIENTS</p>
            <h1 className="mt-2 text-[28px] font-extrabold leading-tight text-[#f4eee4] sm:text-[34px]">Отчётная панель</h1>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-center">
            {mode === 'day' ? (
              <div key="day" className="admin-control-enter">
                <ThemedDatePicker value={selectedDate} onChange={setSelectedDate} />
              </div>
            ) : (
              <div key="period" className="admin-control-enter flex min-h-[56px] w-full rounded-lg border border-[#d6a15f]/35 bg-[#0f0c09] transition-[border-color,box-shadow] duration-300 hover:border-[#d6a15f]/55 hover:shadow-[0_8px_24px_rgba(214,161,95,0.08)] sm:w-[430px]">
                <ThemedDatePicker
                  value={from}
                  onChange={setFrom}
                  embedded
                  ariaLabel="Выбрать начало периода"
                />
                <span className="flex w-9 shrink-0 self-stretch items-center justify-center" aria-hidden="true">
                  <span className="h-[3px] w-6 -translate-x-1 rounded-full bg-[#b9aea0]" />
                </span>
                <ThemedDatePicker
                  value={to}
                  onChange={setTo}
                  embedded
                  showIcon={false}
                  popoverAlign="right"
                  ariaLabel="Выбрать конец периода"
                />
              </div>
            )}
            <div className="flex min-h-[56px] rounded-lg border border-[#d6a15f]/35 bg-[#0f0c09] p-1 transition-[border-color,box-shadow] duration-300 hover:border-[#d6a15f]/55 hover:shadow-[0_8px_24px_rgba(214,161,95,0.08)]">
                {([['day', 'Дата'], ['period', 'Период']] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      if (value === 'period' && mode === 'day') {
                        setFrom(selectedDate);
                        setTo(selectedDate);
                      }
                      setMode(value);
                    }}
                    className={`rounded-md px-5 text-xl font-extrabold uppercase tracking-[0.1em] transition-[color,background-color,transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] ${mode === value ? 'bg-[#d6a15f] text-[#15110d] shadow-[0_5px_16px_rgba(214,161,95,0.18)]' : 'text-[#b9aea0] hover:bg-[#d6a15f]/5 hover:text-[#f4eee4]'}`}
                  >
                    {label}
                  </button>
                ))}
            </div>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={status === 'loading'} className="inline-flex min-h-[56px] items-center justify-center rounded-lg border border-[#d6a15f]/50 px-6 text-xl font-extrabold uppercase tracking-[0.12em] text-[#f4eee4] transition hover:border-[#d6a15f] disabled:opacity-55">
              {status === 'loading' ? 'Загрузка...' : 'Обновить'}
            </button>
          </div>
        </div>
        {status === 'error' && <div className="mt-5 rounded-lg border border-[#d56755]/45 bg-[#2a1512] px-4 py-3 text-sm font-semibold text-[#ef9b8d]">{message}</div>}
      </section>

      {status === 'loading' && <div className={`${panelClass} animate-pulse text-center text-sm font-bold uppercase tracking-[0.12em] text-[#8f857a]`}>Формируем отчёты YCLIENTS…</div>}

      {status === 'ready' && dashboard && report && (
        <>
          <Section eyebrow={isPeriodReport ? 'Итоги периода' : 'Итоги дня'} title={reportTitle}>
            <div className="grid items-stretch gap-5 lg:grid-cols-3">
              <div className="flex flex-col overflow-hidden rounded-lg border border-[#d6a15f]/25">
                <div className="bg-[#201912] px-4 py-3 font-extrabold uppercase tracking-[0.1em] text-[#d6a15f]" style={{ fontSize: '16px', lineHeight: 1.1 }}>
                  Финансовые итоги
                </div>
                {reportRows.map(([label, value], index) => (
                  <div key={label} className={`flex flex-1 flex-col justify-center gap-1 border-b border-[#d6a15f]/20 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between ${index === reportRows.length - 1 ? 'bg-[#d6a15f]/10' : 'bg-[#0f0c09]'}`}>
                    <span className={`font-bold ${index === reportRows.length - 1 ? 'text-[#d6a15f]' : 'text-[#b9aea0]'}`} style={{ fontSize: '18px', lineHeight: 1.1 }}>{label}:</span>
                    <span className={`font-extrabold ${index === reportRows.length - 1 ? 'text-[#f0b45e]' : 'text-[#f4eee4]'}`} style={{ fontSize: '20px', lineHeight: 1.1 }}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col overflow-hidden rounded-lg border border-[#d6a15f]/25">
                <div className="bg-[#201912] px-4 py-3 font-extrabold uppercase tracking-[0.1em] text-[#d6a15f]" style={{ fontSize: '16px', lineHeight: 1.1 }}>Расшифровка расходов</div>
                {expenseRows.length ? expenseRows.map((row) => (
                  <div key={row.title} className="flex flex-1 items-center justify-between gap-4 border-t border-[#d6a15f]/15 bg-[#0f0c09] px-4 py-3 text-sm">
                    <span className="font-semibold text-[#b9aea0]" style={{ fontSize: '18px', lineHeight: 1.1 }}>{row.title}</span><span className="font-extrabold text-[#f4eee4]" style={{ fontSize: '18px', lineHeight: 1.1 }}>{formatMoney(row.amount)}</span>
                  </div>
                )) : <EmptyState text={isPeriodReport ? 'Расходов за период нет' : 'Расходов за день нет'} prominent />}
                {report.expense > 0 && (
                  <div className="flex flex-1 items-center justify-between gap-4 border-t border-[#d6a15f]/20 bg-[#d6a15f]/10 px-4 py-3 text-sm">
                    <span className="font-extrabold text-[#d6a15f]" style={{ fontSize: '18px', lineHeight: 1.1 }}>Расходы + чеки</span>
                    <span className="font-extrabold text-[#f0b45e]" style={{ fontSize: '18px', lineHeight: 1.1 }}>{formatMoney(report.expense)}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col overflow-hidden rounded-lg border border-[#d6a15f]/25">
                <div className="bg-[#201912] px-4 py-3 font-extrabold uppercase tracking-[0.1em] text-[#d6a15f]" style={{ fontSize: '16px', lineHeight: 1.1 }}>Чеки</div>
                {(report.checks?.length || report.unclassifiedChecks > 0) ? (
                  <>
                    {(report.checks ?? []).map((row) => (
                      <div key={row.denomination} className="flex flex-1 items-center justify-between gap-4 border-t border-[#d6a15f]/15 bg-[#0f0c09] px-4 py-3 text-sm">
                        <span className="font-semibold text-[#b9aea0]" style={{ fontSize: '18px', lineHeight: 1.1 }}>{formatMoney(row.denomination)} × {row.quantity}</span>
                        <span className="font-extrabold text-[#f4eee4]" style={{ fontSize: '18px', lineHeight: 1.1 }}>{formatMoney(row.total)}</span>
                      </div>
                    ))}
                    {report.unclassifiedChecks > 0 && (
                      <div className="flex flex-1 items-center justify-between gap-4 border-t border-[#d6a15f]/15 bg-[#0f0c09] px-4 py-3 text-sm">
                        <span className="font-semibold text-[#b9aea0]" style={{ fontSize: '18px', lineHeight: 1.1 }}>КПП — {formatMoney(report.unclassifiedChecks)} наличкой</span>
                        <span className="font-extrabold text-[#f4eee4]" style={{ fontSize: '18px', lineHeight: 1.1 }}>{formatMoney(report.unclassifiedChecks)}</span>
                      </div>
                    )}
                    <div className="flex flex-1 items-center justify-between gap-4 border-t border-[#d6a15f]/20 bg-[#d6a15f]/10 px-4 py-3 text-sm">
                      <span className="font-extrabold text-[#d6a15f]" style={{ fontSize: '18px', lineHeight: 1.1 }}>Всего</span>
                      <span className="font-extrabold text-[#f0b45e]" style={{ fontSize: '18px', lineHeight: 1.1 }}>{formatMoney(checksTotal)}</span>
                    </div>
                  </>
                ) : <EmptyState text={isPeriodReport ? 'Чеков за период нет' : 'Чеков за день нет'} prominent />}
              </div>
            </div>
          </Section>

          <Section eyebrow="Бани" title={isPeriodReport ? 'Записи и показатели по каждой бане за период' : 'Записи и показатели по каждой бане'}>
            <div className="space-y-3">
              {(dashboard.baths ?? []).map((bath) => {
                const isOpen = openBaths.has(bath.id);
                const kitchenTitles = new Set(bath.kitchenOrders.map((item) => item.title.trim().toLocaleLowerCase('ru-RU')));
                return (
                <div key={bath.id} className="overflow-hidden rounded-lg border border-[#d6a15f]/25 bg-[#0f0c09]">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenBaths((current) => {
                      const next = new Set(current);
                      if (next.has(bath.id)) next.delete(bath.id);
                      else next.add(bath.id);
                      return next;
                    })}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-4 text-left text-xl font-extrabold text-[#f4eee4] sm:text-[22px]"
                  >
                    <span>{bath.title}</span>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#d6a15f]/35 bg-[#15110d] text-[#d6a15f] transition-colors duration-300 ${isOpen ? 'bg-[#d6a15f]/10' : ''}`} aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={`h-6 w-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                  <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="min-h-0 overflow-hidden">
                    <div className={`border-t border-[#d6a15f]/20 p-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${isOpen ? 'translate-y-0' : '-translate-y-3'}`}>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      {[
                        ['Выручка с бани', formatMoney(bath.revenue)], ['Предоплаты', formatMoney(bath.prepayments)], ['Кухня', formatMoney(bath.kitchenRevenue)], ['Чеки КПП', formatMoney(bath.kppChecks)], ['Скидки', formatMoney(bath.discounts)],
                      ].map(([label, value]) => <div key={label} className="rounded-lg border border-[#d6a15f]/15 bg-[#15110d] p-3"><div className="text-base font-extrabold uppercase tracking-[0.08em] text-[#81776d]">{label}</div><div className="mt-2 text-[22px] font-extrabold text-[#f4eee4]">{value}</div></div>)}
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 hidden gap-4 lg:grid lg:grid-cols-2">
                        <h3 className="text-base font-extrabold uppercase tracking-[0.1em] text-[#d6a15f]">Записи</h3>
                        <h3 className="text-base font-extrabold uppercase tracking-[0.1em] text-[#d6a15f]">Заказы по кухне</h3>
                      </div>
                      {bath.records.length ? (
                        <div className="space-y-4">
                          {bath.records.map((record) => (
                            <div key={record.id} className="grid items-stretch gap-4 lg:grid-cols-2">
                              <div className="flex h-full flex-col">
                                <h3 className="mb-2 text-base font-extrabold uppercase tracking-[0.1em] text-[#d6a15f] lg:hidden">Запись</h3>
                                <DetailedBathRecordCard record={record} period={isPeriodReport} kitchenTitles={kitchenTitles} />
                              </div>
                              <div className="flex h-full flex-col">
                                <h3 className="mb-2 text-base font-extrabold uppercase tracking-[0.1em] text-[#d6a15f] lg:hidden">Заказ по кухне</h3>
                                <KitchenRecordCard record={record} period={isPeriodReport} kitchenTitles={kitchenTitles} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <span className="text-lg font-semibold text-[#81776d]">Нет записей</span>}
                    </div>
                    </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </Section>

          <Section eyebrow="Кухня" title="Проданные блюда">
            <SalesTable rows={dashboard.kitchen?.sold ?? []} firstColumn="Блюдо" showStock={false} />
          </Section>
          <Section eyebrow="Кухня" title="Использованные расходники">
            <ConsumablesTable rows={dashboard.kitchen?.consumables ?? []} />
          </Section>
          <Section eyebrow="Пиво и напитки" title="Отдельные отчёты">
            <div className="space-y-6"><SalesTable rows={dashboard.beer ?? []} firstColumn="Пиво" /><SalesTable rows={dashboard.drinks ?? []} firstColumn="Напиток" /></div>
          </Section>
          <Section eyebrow="Дополнительные услуги" title="Продажи дополнительных услуг"><SalesTable rows={dashboard.additionalServices ?? []} firstColumn="Дополнительная услуга" /></Section>
        </>
      )}
    </div>
  );
}
