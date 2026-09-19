'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { AvailabilityBath, buildFreeWindowsFromAvailability } from '@/lib/availabilityCopyText';
import { getAdminReportDeadlineDelays, shiftIsoDate } from '@/lib/adminDateRange';

type DailyReport = {
  date: string;
  income: number;
  expense: number;
  prepayments: number;
  cashless: number;
  terminal: number;
  surrendered: number;
  transactionCount: number;
  expenses: Array<{ id: string; title: string; amount: number; comments: string[]; transactionIds: number[] }>;
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
  bathTitle: string;
  services: Array<CatalogService & { discount: number; amount: number; total: number; isKitchen: boolean }>;
  goods: Array<{ id: number; title: string; price: number; discount: number; amount: number; total: number }>;
  payments: Array<{ id: number; date: string; amount: number; account: string; method: 'cash' | 'cashless'; kind: 'prepayment' | 'payment' | 'refund' }>;
  originalTotal: number;
  discountTotal: number;
  total: number;
  prepaymentAmount: number;
  paidAmount: number;
  balance: number;
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
type StandaloneKitchenOrder = {
  id: string;
  recordId: number;
  date: string;
  start: string;
  client: { name: string; phone: string };
  items: Array<{ id: number; title: string; quantity: number; unitPrice: number; total: number }>;
  total: number;
  comment: string;
};
type StockRow = { id: string; storage: string; group: string; subgroup: string; title: string; unit: string; stock: number };
type DataIssue = { id: string; source: string; period: string; reason: string; message: string };
type DataSourceStatus = { source: string; state: 'complete' | 'partial'; updatedAt?: string | null };
type DashboardResponse = {
  ok: boolean;
  date?: string;
  range?: { from: string; to: string };
  report?: DailyReport;
  recordsAvailable?: boolean;
  baths?: BathSummary[];
  kitchen?: { sold: SalesRow[]; consumables: ConsumableRow[]; standaloneOrders: StandaloneKitchenOrder[] };
  additionalServices?: SalesRow[];
  goods?: SalesRow[];
  beer?: SalesRow[];
  drinks?: SalesRow[];
  stocks?: StockRow[];
  dataHealth?: { state: 'complete' | 'partial'; sources: DataSourceStatus[]; issues: DataIssue[] };
  copyText?: { freeWindows: string; occupiedTimes: string; occupiedBaths: string };
  generatedAt?: string;
  reportAccess?: {
    allowed: boolean;
    reason: 'today' | 'yesterday' | 'closed' | 'full_access';
    closesAt: string | null;
    serverNow: string;
  };
  message?: string;
};
type AvailabilityResponse = { ok: boolean; baths?: AvailabilityBath[]; generatedAt?: string; message?: string };
type ReportDeadline = { maskAt: number; refreshAt: number };
export type AdminCopyData = {
  selectedDate: string;
  copyText: { freeWindows: string; occupiedTimes: string; occupiedBaths: string };
};

const localDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Vladivostok', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 });
const compactMoney = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const quantity = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const formatMoney = (value: number) => money.format(value || 0);
const formatCompactMoney = (value: number) => compactMoney.format(value || 0);
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
const recordStateLabel = (state: BathRecord['state']) => ({
  past: 'Прошлая запись',
  current: 'Текущая запись',
  future: 'Будущая запись',
})[state];
const lineCalculation = (amount: number, price: number, total: number) => {
  const original = amount * price;
  const difference = original - total;
  if (Math.abs(difference) < 0.01) return `${formatQuantity(amount)} × ${formatMoney(price)} = ${formatMoney(total)}`;
  const operator = difference > 0 ? '−' : '+';
  return `${formatQuantity(amount)} × ${formatMoney(price)} ${operator} ${formatMoney(Math.abs(difference))} = ${formatMoney(total)}`;
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

export function ThemedDatePicker({
  value,
  onChange,
  embedded = false,
  compact = false,
  shiftLeft = false,
  showIcon = true,
  popoverAlign = 'left',
  ariaLabel = 'Выбрать день для итогов и бань',
  allowedDates,
  currentDate,
}: {
  value: string;
  onChange: (value: string) => void;
  embedded?: boolean;
  compact?: boolean;
  shiftLeft?: boolean;
  showIcon?: boolean;
  popoverAlign?: 'left' | 'right';
  ariaLabel?: string;
  allowedDates?: readonly string[];
  currentDate?: string;
}) {
  const selected = useMemo(() => parseIsoDate(value), [value]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: selected.year, month: selected.month });
  const rootRef = useRef<HTMLDivElement>(null);
  const todayValue = currentDate ?? localDate();

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

  const canNavigateMonth = (offset: number) => {
    if (!allowedDates) return true;
    const target = new Date(view.year, view.month + offset, 1);
    const monthPrefix = `${target.getFullYear()}-${`${target.getMonth() + 1}`.padStart(2, '0')}-`;
    return allowedDates.some((date) => date.startsWith(monthPrefix));
  };

  const chooseDate = (day: number) => {
    const nextDate = isoDate(view.year, view.month, day);
    if (allowedDates && !allowedDates.includes(nextDate)) return;
    onChange(nextDate);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={embedded ? `relative min-w-0 ${showIcon ? 'flex-[1.15] sm:w-[224px] sm:flex-none' : 'flex-1'}` : 'relative w-full sm:w-auto'}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex min-h-[56px] w-full cursor-pointer items-center justify-center whitespace-nowrap bg-[#0f0c09] text-center font-extrabold text-[#f4eee4] outline-none transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] focus:bg-[#d6a15f]/5 ${compact ? 'text-lg sm:text-xl' : 'text-2xl'} ${
          embedded
            ? `rounded-lg hover:bg-[#d6a15f]/5 ${compact ? 'px-1.5 sm:px-3' : 'px-3'}`
            : 'rounded-lg border border-[#d6a15f]/35 px-5 hover:border-[#d6a15f]/70 hover:shadow-[0_8px_24px_rgba(214,161,95,0.08)] focus:border-[#d6a15f] sm:w-[265px]'
        }`}
      >
        <span className={`flex items-center justify-center ${!embedded ? '-translate-x-2' : shiftLeft ? 'md:-translate-x-[24px]' : ''}`}>
          {showIcon && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" className={`${compact ? 'mr-2 h-6 w-6 sm:mr-3 sm:h-8 sm:w-8' : embedded ? 'mr-3 h-8 w-8 sm:h-9 sm:w-9' : 'mr-4 h-8 w-8 sm:mr-5 sm:h-9 sm:w-9'} shrink-0 text-[#d6a15f]`} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3m10-3v3M4.5 9.5h15M6.5 5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
            </svg>
          )}
          <span>{shortDate(value)}</span>
        </span>
      </button>

        <div
          aria-hidden={!open}
          className={`absolute top-full z-50 mt-3 w-[min(330px,calc(100vw-3rem))] origin-top rounded-xl border border-[#d6a15f]/55 bg-[#15110d] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.7)] transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${popoverAlign === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'} ${open ? 'visible translate-y-0 scale-100 opacity-100' : 'invisible pointer-events-none -translate-y-2 scale-[0.97] opacity-0'}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <button type="button" aria-label="Предыдущий месяц" onClick={() => changeMonth(-1)} disabled={!canNavigateMonth(-1)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d6a15f]/30 text-[#d6a15f] transition hover:border-[#d6a15f] hover:bg-[#d6a15f]/10 disabled:cursor-not-allowed disabled:opacity-30">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" /></svg>
            </button>
            <div className="text-center">
              <div className="text-lg font-extrabold text-[#f4eee4]">{calendarMonths[view.month]}</div>
              <div className="text-xs font-extrabold tracking-[0.14em] text-[#d6a15f]">{view.year}</div>
            </div>
            <button type="button" aria-label="Следующий месяц" onClick={() => changeMonth(1)} disabled={!canNavigateMonth(1)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d6a15f]/30 text-[#d6a15f] transition hover:border-[#d6a15f] hover:bg-[#d6a15f]/10 disabled:cursor-not-allowed disabled:opacity-30">
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
              const isAllowed = !allowedDates || allowedDates.includes(cellValue);
              return (
                <button
                  key={cellValue}
                  type="button"
                  aria-label={dateLabel(cellValue)}
                  aria-pressed={isSelected}
                  disabled={!isAllowed}
                  onClick={() => chooseDate(day)}
                  className={`h-9 rounded-md text-sm font-extrabold transition ${
                    !isAllowed
                      ? 'cursor-not-allowed text-[#81776d]/35'
                      : isSelected
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

function SalesTable({
  rows,
  firstColumn,
  showStock = true,
  emptyText = 'За выбранный диапазон данных нет.',
}: {
  rows: SalesRow[];
  firstColumn: string;
  showStock?: boolean;
  emptyText?: string;
}) {
  if (!rows.length) return <EmptyState text={emptyText} />;
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

function ResponsiveReportMoney({ value }: { value: number }) {
  return (
    <>
      <span className="sm:hidden">{formatCompactMoney(value)}</span>
      <span className="hidden sm:inline">{formatMoney(value)}</span>
    </>
  );
}

function StandaloneKitchenOrders({ rows }: { rows: StandaloneKitchenOrder[] }) {
  if (!rows.length) return <EmptyState text="Заказов кухни без привязки к бане за выбранный диапазон нет." />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((order) => (
        <article key={order.id} className="rounded-lg border border-[#d6a15f]/25 bg-[#0f0c09] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold uppercase tracking-[0.1em] text-[#d6a15f]">
                {dateLabel(order.date)} · {order.start || 'время не указано'}
              </div>
              <div className="mt-2 text-xl font-extrabold text-[#f4eee4]">{order.client.name}</div>
              {order.client.phone && <a className="mt-1 block font-semibold text-[#d6a15f]" href={`tel:${order.client.phone}`}>{order.client.phone}</a>}
            </div>
            <div className="text-xl font-extrabold text-[#f0b45e]">{formatMoney(order.total)}</div>
          </div>
          <div className="mt-4 space-y-2">
            {order.items.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex items-center justify-between gap-4 rounded-md bg-[#15110d] px-3 py-2 text-sm font-semibold text-[#b9aea0]">
                <span>{item.title}</span>
                <span className="shrink-0 font-extrabold text-[#f4eee4]">{lineCalculation(item.quantity, item.unitPrice, item.total)}</span>
              </div>
            ))}
          </div>
          {order.comment && <div className="mt-3 rounded-md border border-[#d6a15f]/15 px-3 py-2 text-sm font-semibold text-[#b9aea0]">{order.comment}</div>}
        </article>
      ))}
    </div>
  );
}

function DataHealthPanel({
  issues,
  sources,
  lastSuccessful,
}: {
  issues: DataIssue[];
  sources: DataSourceStatus[];
  lastSuccessful: Record<string, string>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  if (!issues.length && !sources.length) return null;
  const updatedLabel = (value?: string) => value
    ? new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Asia/Vladivostok',
    }).format(new Date(value))
    : 'успешного обновления ещё не было';
  return (
    <div className={`rounded-lg border p-4 md:px-4 md:py-3 ${issues.length ? 'border-[#d98a4a]/45 bg-[#2a1d12]' : 'border-[#d6a15f]/25 bg-[#15110d]'}`}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-[#d6a15f]/55"
      >
        <span className={`text-[17px] font-extrabold md:text-xl ${issues.length ? 'text-[#e9a66e]' : 'text-[#d6a15f]'}`}>
          {issues.length ? 'Часть данных не загружена' : 'Источники данных обновлены'}
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d6a15f]/30 text-[#d6a15f] md:h-11 md:w-11" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={`h-5 w-5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:h-6 md:w-6 ${isOpen ? 'rotate-180' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 overflow-hidden">
          {!!sources.length && (
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {sources.map((source) => (
                <div key={source.source} className="rounded-md border border-[#d6a15f]/15 bg-[#0f0c09] px-3 py-2 text-sm font-semibold text-[#b9aea0]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-extrabold text-[#f4eee4]">{source.source}</span>
                    <span className={source.state === 'complete' ? 'text-[#9bc29b]' : 'text-[#e9a66e]'}>
                      {source.state === 'complete' ? 'Загружено' : 'Неполно'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#81776d]">Последнее успешное: {updatedLabel(lastSuccessful[source.source])}</div>
                </div>
              ))}
            </div>
          )}
          {!!issues.length && <div className="mt-3 space-y-2">
            {issues.map((issue) => (
              <div key={issue.id} className="rounded-md bg-[#0f0c09] px-3 py-2 text-sm font-semibold leading-6 text-[#b9aea0]">
                <span className="font-extrabold text-[#f4eee4]">{issue.source}</span> · {issue.period}: {issue.message}
              </div>
            ))}
          </div>}
        </div>
      </div>
    </div>
  );
}

function StocksTable({ rows, updatedAt }: { rows: StockRow[]; updatedAt?: string }) {
  if (!rows.length) return <EmptyState text="Нет данных по текущим остаткам. Проверьте доступ к складам YCLIENTS." />;
  let previousStorage = '';
  let previousSubgroup = '';
  return (
    <div>
      <div className="mb-4 text-sm font-semibold text-[#8f857a]">
        Текущие остатки, не исторические{updatedAt ? ` · обновлено ${new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Vladivostok' }).format(new Date(updatedAt))}` : ''}
      </div>
      <div className="admin-stock-scrollbar max-h-[680px] overflow-auto rounded-lg border border-[#d6a15f]/25">
        <table className="w-full min-w-[900px] border-collapse">
          <thead className={`${tableHeadClass} sticky top-0 z-10`} style={{ fontSize: '14px' }}>
            <tr><th className="px-4 py-3">Склад</th><th className="px-4 py-3">Группа</th><th className="px-4 py-3">Подгруппа</th><th className="px-4 py-3">Наименование</th><th className="px-4 py-3 text-right">Единица</th><th className="px-4 py-3 text-right">Остаток</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const showStorage = row.storage !== previousStorage;
              const showSubgroup = showStorage || row.subgroup !== previousSubgroup;
              previousStorage = row.storage;
              previousSubgroup = row.subgroup;
              return (
                <tr key={row.id} className="bg-[#0f0c09] transition hover:bg-[#18120d]">
                  <td className={`${tableCellClass} font-extrabold text-[#d6a15f]`}>{showStorage ? row.storage : ''}</td>
                  <td className={tableCellClass}>{showStorage ? row.group : ''}</td>
                  <td className={`${tableCellClass} font-bold text-[#b9aea0]`}>{showSubgroup ? row.subgroup : ''}</td>
                  <td className={`${tableCellClass} font-bold text-[#f4eee4]`}>{row.title}</td>
                  <td className={`${tableCellClass} text-right`}>{row.unit}</td>
                  <td className={`${tableCellClass} text-right text-lg font-extrabold`}><StockValue value={row.stock} unit={row.unit} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CopyCard({
  title,
  text,
  subgroupCopy = false,
  emptyText = 'Нет записей на выбранный день.',
}: {
  title: string;
  text: string;
  subgroupCopy?: boolean;
  emptyText?: string;
}) {
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
      <pre className="mt-4 flex-1 whitespace-pre-wrap font-sans text-sm font-semibold leading-6 text-[#b9aea0]">{text || emptyText}</pre>
      {subgroupCopy && text && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#d6a15f]/15 pt-3">
          {text.split(/\n\n+/).filter((group) => group.includes('\n')).map((group, index) => {
            const label = group.split('\n')[0];
            return <button key={`${label}-${index}`} type="button" onClick={() => navigator.clipboard.writeText(group)} className="rounded-lg border border-[#d6a15f]/30 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#b9aea0] transition hover:border-[#d6a15f] hover:text-[#d6a15f]">Копировать · {label}</button>;
          })}
        </div>
      )}
    </article>
  );
}

export function AdminCopyTextsPanel({ data }: { data: AdminCopyData | null }) {
  if (!data) return null;
  return (
    <Section eyebrow="Тексты для копирования" title={`Расписание на ${dateLabel(data.selectedDate)}`}>
      <div className="grid gap-4 xl:grid-cols-3">
        <CopyCard title="Свободные окна по баням" text={data.copyText.freeWindows} emptyText="Свободные окна временно недоступны." />
        <CopyCard title="Все занятые времена" text={data.copyText.occupiedTimes} />
        <CopyCard title="Занятые бани с подписями" text={data.copyText.occupiedBaths} subgroupCopy />
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
  const kitchenTotal = kitchenServices.reduce((sum, service) => sum + service.total, 0);
  return (
    <article id={`admin-record-${record.id}`} className="flex flex-1 scroll-mt-6 flex-col rounded-lg border border-[#d6a15f]/25 bg-[#15110d] p-4 sm:p-5">
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
        <div className="flex flex-col items-end gap-2">
          <div className={`rounded-full border px-3 py-1 text-sm font-extrabold ${record.state === 'current' ? 'border-[#78a978]/55 bg-[#17301d]/45 text-[#b9d9b9]' : record.state === 'future' ? 'border-[#d6a15f]/45 bg-[#d6a15f]/10 text-[#f0b45e]' : 'border-[#d6a15f]/20 text-[#81776d]'}`}>
            {recordStateLabel(record.state)}
          </div>
          <div className="rounded-full border border-[#d6a15f]/30 px-3 py-1 text-base font-bold text-[#b9aea0]">
            {attendanceLabel(record.attendance)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-lg sm:grid-cols-4">
        <div className="rounded-lg bg-[#0f0c09] px-3 py-2">
          <div className="text-base font-bold uppercase tracking-[0.1em] text-[#81776d]">Длительность</div>
          <div className="mt-1 font-extrabold text-[#f4eee4]">{durationLabel(record.durationMinutes)}</div>
        </div>
        <div className="rounded-lg bg-[#0f0c09] px-3 py-2">
          <div className="text-base font-bold uppercase tracking-[0.1em] text-[#81776d]">Баня</div>
          <div className="mt-1 font-extrabold text-[#f4eee4]">{record.bathTitle}</div>
        </div>
        <div className="rounded-lg bg-[#0f0c09] px-3 py-2">
          <div className="text-base font-bold uppercase tracking-[0.1em] text-[#81776d]">Предоплата</div>
          <div className="mt-1 font-extrabold text-[#f4eee4]">{formatMoney(record.prepaymentAmount)}</div>
        </div>
        <div className="rounded-lg bg-[#0f0c09] px-3 py-2">
          <div className="text-base font-bold uppercase tracking-[0.1em] text-[#81776d]">Остаток</div>
          <div className={`mt-1 font-extrabold ${record.balance > 0 ? 'text-[#e9a66e]' : 'text-[#9bc29b]'}`}>{formatMoney(record.balance)}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-base font-extrabold uppercase tracking-[0.12em] text-[#b9aea0]">Выбранные услуги</div>
        <div className="mt-2 space-y-3">
          {selectedServices.map((service, index) => (
            <div key={`${service.id}-${index}`} className="flex items-center justify-between gap-4 rounded-lg bg-[#0f0c09] px-4 py-3 text-lg font-semibold text-[#b9aea0]">
              <span>{service.title}</span>
              <span className="shrink-0 text-right font-extrabold text-[#f4eee4]">
                {lineCalculation(service.amount, service.price, service.total)}
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

      {record.goods.length > 0 && (
        <div className="mt-4">
          <div className="text-base font-extrabold uppercase tracking-[0.12em] text-[#b9aea0]">Товары</div>
          <div className="mt-2 space-y-3">
            {record.goods.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex items-center justify-between gap-4 rounded-lg bg-[#0f0c09] px-4 py-3 text-lg font-semibold text-[#b9aea0]">
                <span>{item.title}</span><span className="shrink-0 font-extrabold text-[#f4eee4]">{lineCalculation(item.amount, item.price, item.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="text-base font-extrabold uppercase tracking-[0.12em] text-[#b9aea0]">Оплата</div>
        {record.payments.length ? <div className="mt-2 space-y-2">{record.payments.map((payment, index) => (
          <div key={`${payment.id}-${index}`} className="grid gap-1 rounded-lg bg-[#0f0c09] px-4 py-3 text-base font-semibold text-[#b9aea0] sm:grid-cols-[1fr_auto]">
            <span>{payment.account} · {payment.method === 'cash' ? 'НАЛ' : 'Б/Н'} · {payment.kind === 'prepayment' ? 'предоплата' : payment.kind === 'refund' ? 'возврат' : 'оплата'}</span>
            <span className={`font-extrabold ${payment.amount < 0 ? 'text-[#ef9b8d]' : 'text-[#f4eee4]'}`}>{formatMoney(payment.amount)}</span>
          </div>
        ))}</div> : <div className="mt-2 text-base font-semibold text-[#81776d]">Платежи к записи не получены</div>}
      </div>

      {record.comment && <p className="mt-4 text-lg font-semibold leading-7 text-[#b9aea0]">Комментарий: {record.comment}</p>}

      <div className="mt-auto grid gap-2 border-t border-[#d6a15f]/20 pt-4 text-lg font-extrabold sm:grid-cols-3">
        <div><span className="block text-xs uppercase tracking-[0.08em] text-[#81776d]">Скидки</span><span className="text-[#f4eee4]">{formatMoney(record.discountTotal)}</span></div>
        <div><span className="block text-xs uppercase tracking-[0.08em] text-[#81776d]">Оплачено</span><span className="text-[#f4eee4]">{formatMoney(record.paidAmount)}</span></div>
        <div className="sm:text-right"><span className="block text-xs uppercase tracking-[0.08em] text-[#d6a15f]">Общая стоимость</span><span className="text-[#f0b45e]">{formatMoney(record.total)}</span></div>
      </div>
    </article>
  );
}

function KitchenRecordCard({ record, period, kitchenTitles }: { record: BathRecord; period: boolean; kitchenTitles: Set<string> }) {
  const kitchenServices = record.services.filter((service) => service.isKitchen || kitchenTitles.has(service.title.trim().toLocaleLowerCase('ru-RU')));
  const kitchenTotal = kitchenServices.reduce((sum, service) => sum + service.total, 0);

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
                  {lineCalculation(service.amount, service.price, service.total)}
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
  allowPeriod = true,
  adminOnlyRecentDates = false,
  manualRefreshKey = 0,
  onLoadingChange,
  onUpdatedAt,
  onCopyData,
  afterFinancialReport,
}: {
  allowPeriod?: boolean;
  adminOnlyRecentDates?: boolean;
  manualRefreshKey?: number;
  onLoadingChange?: (loading: boolean) => void;
  onUpdatedAt?: (value: string) => void;
  onCopyData?: (value: AdminCopyData | null) => void;
  afterFinancialReport?: ReactNode;
}) {
  const [today, setToday] = useState(localDate);
  const allowedAdminDates = useMemo(
    () => adminOnlyRecentDates ? [today, shiftIsoDate(today, -1)] : undefined,
    [adminOnlyRecentDates, today],
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [mode, setMode] = useState<'day' | 'period'>('day');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reloadKey, setReloadKey] = useState(0);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [openBaths, setOpenBaths] = useState<Set<string>>(() => new Set());
  const [sourceUpdates, setSourceUpdates] = useState<Record<string, string>>({});
  const [reportExpired, setReportExpired] = useState(false);
  const [reportDeadline, setReportDeadline] = useState<ReportDeadline | null>(null);
  const [pendingRecordNavigation, setPendingRecordNavigation] = useState<{
    date: string;
    bathId: string;
    time: string;
  } | null>(null);

  const rangeFrom = mode === 'day' ? selectedDate : from;
  const rangeTo = mode === 'day' ? selectedDate : to;
  const copyDate = mode === 'day' ? selectedDate : rangeFrom;

  useEffect(() => {
    if (!allowPeriod && mode !== 'day') setMode('day');
  }, [allowPeriod, mode]);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(localDate()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (allowedAdminDates && !allowedAdminDates.includes(selectedDate)) setSelectedDate(today);
  }, [allowedAdminDates, selectedDate, today]);

  useEffect(() => {
    onLoadingChange?.(status === 'loading');
  }, [onLoadingChange, status]);

  useEffect(() => {
    const openRecord = (event: Event) => {
      const detail = (event as CustomEvent<{ date?: string; bathId?: string; time?: string }>).detail;
      if (!detail?.date || !detail.bathId || !detail.time) return;
      if (allowedAdminDates && !allowedAdminDates.includes(detail.date)) return;
      setMode('day');
      setSelectedDate(detail.date);
      setPendingRecordNavigation({
        date: detail.date,
        bathId: detail.bathId,
        time: detail.time,
      });
      document.getElementById('admin-bath-records')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener('admin:open-record', openRecord);
    return () => window.removeEventListener('admin:open-record', openRecord);
  }, [allowedAdminDates]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    async function load() {
      const requestStartedAt = performance.now();
      setStatus('loading');
      setMessage('');
      setDashboard(null);
      setReportDeadline(null);
      setReportExpired(false);
      try {
        const query = new URLSearchParams({ date: copyDate, from: rangeFrom, to: rangeTo });
        const shouldLoadAvailability = copyDate >= today;
        const [response, availabilityResponse] = await Promise.all([
          fetch(`/api/admin/yclients?${query}`, { cache: 'no-store', signal: controller.signal }),
          shouldLoadAvailability
            ? fetch(`/api/yclients/availability?from=${copyDate}&days=1`, {
              cache: 'no-store',
              signal: controller.signal,
            }).catch(() => null)
            : Promise.resolve(null),
        ]);
        const payload = (await response.json()) as DashboardResponse;
        if (ignore) return;
        if (!response.ok || !payload.ok) throw new Error(payload.message || 'Не удалось загрузить данные YCLIENTS.');
        const availabilityPayload = availabilityResponse
          ? await availabilityResponse.json().catch(() => null) as AvailabilityResponse | null
          : null;
        if (ignore) return;
        const availabilityComplete = !shouldLoadAvailability || Boolean(
          availabilityResponse?.ok && availabilityPayload?.ok && availabilityPayload.baths?.length,
        );
        const availabilityBaths = availabilityComplete ? availabilityPayload?.baths ?? [] : [];
        const freeWindows = !shouldLoadAvailability
          ? payload.copyText?.freeWindows ?? ''
          : availabilityComplete
            ? buildFreeWindowsFromAvailability(availabilityBaths, copyDate)
            : '';
        const availabilityIssue: DataIssue | null = !shouldLoadAvailability || availabilityComplete ? null : {
          id: `availability:${copyDate}`,
          source: 'Свободные окна YCLIENTS',
          period: copyDate,
          reason: availabilityResponse?.status === 401 || availabilityResponse?.status === 403 ? 'permissions' : 'unavailable',
          message: availabilityPayload?.message || 'Не удалось загрузить фактические свободные окна; пустой блок не считается подтверждённым отсутствием окон.',
        };
        const payloadSources = payload.dataHealth?.sources ?? [];
        const payloadIssues = payload.dataHealth?.issues ?? [];
        const readyAt = performance.now();
        const deadlineDelays = payload.reportAccess?.closesAt && payload.reportAccess.serverNow
          ? getAdminReportDeadlineDelays(
            payload.reportAccess.closesAt,
            payload.reportAccess.serverNow,
            readyAt - requestStartedAt,
          )
          : null;
        setReportExpired(deadlineDelays?.maskAfterMs === 0);
        setReportDeadline(deadlineDelays ? {
          maskAt: readyAt + deadlineDelays.maskAfterMs,
          refreshAt: readyAt + deadlineDelays.refreshAfterMs,
        } : null);
        setDashboard({
          ...payload,
          dataHealth: {
            state: payload.dataHealth?.state === 'partial' || availabilityIssue ? 'partial' : 'complete',
            sources: [
              ...payloadSources,
              ...(shouldLoadAvailability ? [{
                source: 'Свободные окна YCLIENTS',
                state: availabilityComplete ? 'complete' as const : 'partial' as const,
                updatedAt: availabilityComplete ? availabilityPayload?.generatedAt ?? payload.generatedAt ?? null : null,
              }] : []),
            ],
            issues: [...payloadIssues, ...(availabilityIssue ? [availabilityIssue] : [])],
          },
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
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [copyDate, manualRefreshKey, onUpdatedAt, rangeFrom, rangeTo, reloadKey, today]);

  useEffect(() => {
    if (!reportDeadline) return;
    const maxDelay = 2_147_000_000;
    const maskTimer = window.setTimeout(
      () => setReportExpired(true),
      Math.min(Math.max(0, reportDeadline.maskAt - performance.now()), maxDelay),
    );
    const refreshTimer = window.setTimeout(
      () => setReloadKey((value) => value + 1),
      Math.min(Math.max(0, reportDeadline.refreshAt - performance.now()), maxDelay),
    );
    return () => {
      window.clearTimeout(maskTimer);
      window.clearTimeout(refreshTimer);
    };
  }, [reportDeadline]);

  useEffect(() => {
    const sources = dashboard?.dataHealth?.sources ?? [];
    if (!sources.length) return;
    setSourceUpdates((current) => {
      const next = { ...current };
      sources.forEach((source) => {
        if (source.state === 'complete' && source.updatedAt) next[source.source] = source.updatedAt;
      });
      return next;
    });
  }, [dashboard?.dataHealth?.sources]);

  useEffect(() => {
    if (status !== 'ready') return;
    // Обновляем раз в 5 минут в любом случае: при неполных данных частые
    // повторы только упирались в лимиты YCLIENTS и дёргали панель.
    const timer = window.setInterval(() => setReloadKey((value) => value + 1), 300_000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (!pendingRecordNavigation || status !== 'ready' || dashboard?.date !== pendingRecordNavigation.date) return;
    const bath = dashboard.baths?.find((candidate) => candidate.id === pendingRecordNavigation.bathId);
    if (!bath) return;
    const point = Number(pendingRecordNavigation.time.slice(0, 2)) * 60
      + Number(pendingRecordNavigation.time.slice(3, 5));
    const record = bath.records.find((candidate) => {
      const start = Number(candidate.start.slice(0, 2)) * 60 + Number(candidate.start.slice(3, 5));
      const endRaw = Number(candidate.end.slice(0, 2)) * 60 + Number(candidate.end.slice(3, 5));
      const end = endRaw <= start ? endRaw + 24 * 60 : endRaw;
      const adjustedPoint = point < start && end > 24 * 60 ? point + 24 * 60 : point;
      return adjustedPoint >= start && adjustedPoint < end;
    });
    setOpenBaths((current) => new Set(current).add(bath.id));
    const targetId = record ? `admin-record-${record.id}` : 'admin-bath-records';
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPendingRecordNavigation(null);
    }, 550);
    return () => window.clearTimeout(timer);
  }, [dashboard, pendingRecordNavigation, status]);

  const report = reportExpired ? undefined : dashboard?.report;
  const reportRows = report ? [
    ['Приход', 'Приход', formatMoney(report.income), formatCompactMoney(report.income)],
    ['Расход', 'Расход', formatMoney(report.expense), formatCompactMoney(report.expense)],
    ['Предоплаты', 'Предоплаты', formatMoney(report.prepayments), formatCompactMoney(report.prepayments)],
    ['Безналичная оплата', 'Безнал', `${formatMoney(report.cashless)} (${formatMoney(report.terminal)})`, `${formatCompactMoney(report.cashless)} (${formatCompactMoney(report.terminal)})`],
    ['Сдал', 'Сдал', formatMoney(report.surrendered), formatCompactMoney(report.surrendered)],
  ] : [];
  const expenseRows = report?.expenses ?? [];
  const checksTotal = report
    ? (report.checks ?? []).reduce((sum, row) => sum + row.total, 0) + (report.unclassifiedChecks ?? 0)
    : 0;
  const isPeriodReport = mode === 'period' && rangeFrom !== rangeTo;
  const reportTitle = isPeriodReport
    ? `Отчёт за период ${shortDate(rangeFrom)} — ${shortDate(rangeTo)}`
    : `Отчёт за ${dateLabel(report?.date ?? rangeFrom)}`;
  const recordsAvailable = dashboard?.recordsAvailable !== false;

  useEffect(() => {
    const copyText = dashboard?.copyText;
    onCopyData?.(copyText ? { selectedDate: copyDate, copyText } : null);
  }, [copyDate, dashboard?.copyText, onCopyData]);

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[15px] font-extrabold uppercase tracking-[0.18em] text-[#d6a15f] sm:text-base">YCLIENTS</p>
            <h1 className="mt-2 text-[28px] font-extrabold leading-tight text-[#f4eee4] sm:text-[34px]">Отчётная панель</h1>
          </div>
          <div className="flex w-full flex-col items-center gap-4 md:flex-row md:flex-nowrap md:justify-center xl:w-auto">
            {mode === 'day' ? (
              <div key="day" className="admin-control-enter w-full sm:w-[265px]">
                <ThemedDatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  allowedDates={allowedAdminDates}
                  currentDate={today}
                />
              </div>
            ) : (
              <div key="period" className="admin-control-enter flex min-h-[56px] w-full max-w-[430px] flex-row items-stretch rounded-lg border border-[#d6a15f]/35 bg-[#0f0c09] transition-[border-color,box-shadow] duration-300 hover:border-[#d6a15f]/55 hover:shadow-[0_8px_24px_rgba(214,161,95,0.08)] md:w-[360px] md:shrink-0 xl:w-[390px]">
                <ThemedDatePicker
                  value={from}
                  onChange={(value) => {
                    setFrom(value);
                    if (value > to) setTo(value);
                  }}
                  embedded
                  compact
                  currentDate={today}
                  ariaLabel="Выбрать начало периода"
                />
                <span className="flex w-5 translate-x-1 shrink-0 self-stretch items-center justify-center sm:w-9 md:-translate-x-[24px]" aria-hidden="true">
                  <span className="h-[3px] w-4 rounded-full bg-[#b9aea0] sm:w-6" />
                </span>
                <ThemedDatePicker
                  value={to}
                  onChange={(value) => {
                    setTo(value);
                    if (value < from) setFrom(value);
                  }}
                  embedded
                  compact
                  shiftLeft
                  currentDate={today}
                  showIcon={false}
                  popoverAlign="right"
                  ariaLabel="Выбрать конец периода"
                />
              </div>
            )}
            {allowPeriod && <div className="flex min-h-[56px] w-full max-w-[430px] rounded-lg border border-[#d6a15f]/35 bg-[#0f0c09] p-1 transition-[border-color,box-shadow] duration-300 hover:border-[#d6a15f]/55 hover:shadow-[0_8px_24px_rgba(214,161,95,0.08)] sm:w-auto md:shrink-0">
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
                    className={`flex-1 rounded-md px-4 text-lg font-extrabold uppercase tracking-[0.08em] transition-[color,background-color,transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] sm:flex-none md:px-4 md:text-lg xl:px-5 xl:text-xl xl:tracking-[0.1em] ${mode === value ? 'bg-[#d6a15f] text-[#15110d] shadow-[0_5px_16px_rgba(214,161,95,0.18)]' : 'text-[#b9aea0] hover:bg-[#d6a15f]/5 hover:text-[#f4eee4]'}`}
                  >
                    {label}
                  </button>
                ))}
            </div>}
          </div>
        </div>
        {status === 'error' && <div className="mt-5 rounded-lg border border-[#d56755]/45 bg-[#2a1512] px-4 py-3 text-sm font-semibold text-[#ef9b8d]">{message}</div>}
      </section>

      {status === 'loading' && <div className={`${panelClass} animate-pulse text-center text-sm font-bold uppercase tracking-[0.12em] text-[#8f857a]`}>Формируем отчёты YCLIENTS…</div>}

      {status === 'ready' && dashboard && (
        <>
          <DataHealthPanel
            issues={dashboard.dataHealth?.issues ?? []}
            sources={dashboard.dataHealth?.sources ?? []}
            lastSuccessful={sourceUpdates}
          />
          {dashboard.reportAccess && !dashboard.reportAccess.allowed && (
            <div className="rounded-lg border border-[#d6a15f]/35 bg-[#15110d] px-5 py-4 text-base font-semibold leading-7 text-[#b9aea0]">
              Администратору доступны отчёты только за сегодня и вчера по времени Владивостока.
            </div>
          )}
          {reportExpired && dashboard.reportAccess?.allowed && (
            <div className="rounded-lg border border-[#d6a15f]/35 bg-[#15110d] px-5 py-4 text-base font-semibold leading-7 text-[#b9aea0]">
              Срок доступа к финансовому отчёту завершён. Финансовые блоки скрыты; серверная проверка обновляется автоматически.
            </div>
          )}
          {!reportExpired && dashboard.reportAccess?.allowed && !report && (
            <div className="rounded-lg border border-[#d98a4a]/45 bg-[#2a1d12] px-5 py-4 text-base font-semibold leading-7 text-[#e9a66e]">
              Финансовые данные за выбранный период не загрузились. Нули не показаны, чтобы не выдавать отсутствие данных за подтверждённый результат. Повторная попытка выполняется автоматически; также можно нажать «Обновить».
            </div>
          )}
          {report && <Section eyebrow={isPeriodReport ? 'Итоги периода' : 'Итоги дня'} title={reportTitle}>
            <div className="grid items-stretch gap-5 lg:grid-cols-3">
              <div className="flex flex-col overflow-hidden rounded-lg border border-[#d6a15f]/25">
                <div className="bg-[#201912] px-4 py-3 font-extrabold uppercase tracking-[0.1em] text-[#d6a15f]" style={{ fontSize: '16px', lineHeight: 1.1 }}>
                  Финансовые итоги
                </div>
                {reportRows.map(([label, mobileLabel, value, mobileValue], index) => (
                  <div key={label} className={`flex flex-1 flex-row items-center justify-between gap-2 border-b border-[#d6a15f]/20 px-4 py-4 last:border-b-0 ${index === reportRows.length - 1 ? 'bg-[#d6a15f]/10' : 'bg-[#0f0c09]'}`}>
                    <span className={`font-bold ${index === reportRows.length - 1 ? 'text-[#d6a15f]' : 'text-[#b9aea0]'}`} style={{ fontSize: '18px', lineHeight: 1.1 }}><span className="sm:hidden">{mobileLabel}</span><span className="hidden sm:inline">{label}</span>:</span>
                    <span className={`shrink-0 text-right font-extrabold ${index === reportRows.length - 1 ? 'text-[#f0b45e]' : 'text-[#f4eee4]'}`} style={{ fontSize: '20px', lineHeight: 1.1 }}><span className="sm:hidden">{mobileValue}</span><span className="hidden sm:inline">{value}</span></span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col overflow-hidden rounded-lg border border-[#d6a15f]/25">
                <div className="bg-[#201912] px-4 py-3 font-extrabold uppercase tracking-[0.1em] text-[#d6a15f]" style={{ fontSize: '16px', lineHeight: 1.1 }}>Расшифровка расходов</div>
                {expenseRows.length ? expenseRows.map((row) => (
                  <div key={row.id} className="flex flex-1 items-start justify-between gap-4 border-t border-[#d6a15f]/15 bg-[#0f0c09] px-4 py-3 text-sm">
                    <span className="font-semibold text-[#b9aea0]" style={{ fontSize: '18px', lineHeight: 1.2 }}>{row.title}{row.comments?.length ? <span className="mt-1 block text-sm font-semibold text-[#81776d]">{row.comments.join(' · ')}</span> : null}</span><span className="shrink-0 font-extrabold text-[#f4eee4]" style={{ fontSize: '18px', lineHeight: 1.1 }}><ResponsiveReportMoney value={row.amount} /></span>
                  </div>
                )) : <EmptyState text={isPeriodReport ? 'Расходов за период нет' : 'Расходов за день нет'} prominent />}
                {report.expense > 0 && (
                  <div className="flex flex-1 items-center justify-between gap-4 border-t border-[#d6a15f]/20 bg-[#d6a15f]/10 px-4 py-3 text-sm">
                    <span className="font-extrabold text-[#d6a15f]" style={{ fontSize: '18px', lineHeight: 1.1 }}>Всего расходов</span>
                    <span className="font-extrabold text-[#f0b45e]" style={{ fontSize: '18px', lineHeight: 1.1 }}><ResponsiveReportMoney value={report.expense} /></span>
                  </div>
                )}
              </div>
              <div className="flex flex-col overflow-hidden rounded-lg border border-[#d6a15f]/25">
                <div className="bg-[#201912] px-4 py-3 font-extrabold uppercase tracking-[0.1em] text-[#d6a15f]" style={{ fontSize: '16px', lineHeight: 1.1 }}>Чеки</div>
                {(report.checks?.length || report.unclassifiedChecks > 0) ? (
                  <>
                    {(report.checks ?? []).map((row) => (
                      <div key={row.denomination} className="flex flex-1 items-center justify-between gap-4 border-t border-[#d6a15f]/15 bg-[#0f0c09] px-4 py-3 text-sm">
                        <span className="font-semibold text-[#b9aea0]" style={{ fontSize: '18px', lineHeight: 1.1 }}><ResponsiveReportMoney value={row.denomination} /> × {row.quantity}</span>
                        <span className="font-extrabold text-[#f4eee4]" style={{ fontSize: '18px', lineHeight: 1.1 }}><ResponsiveReportMoney value={row.total} /></span>
                      </div>
                    ))}
                    {report.unclassifiedChecks > 0 && (
                      <div className="flex flex-1 items-center justify-between gap-4 border-t border-[#d6a15f]/15 bg-[#0f0c09] px-4 py-3 text-sm">
                        <span className="font-semibold text-[#b9aea0]" style={{ fontSize: '18px', lineHeight: 1.1 }}>КПП — <ResponsiveReportMoney value={report.unclassifiedChecks} /> наличкой</span>
                        <span className="font-extrabold text-[#f4eee4]" style={{ fontSize: '18px', lineHeight: 1.1 }}><ResponsiveReportMoney value={report.unclassifiedChecks} /></span>
                      </div>
                    )}
                    <div className="flex flex-1 items-center justify-between gap-4 border-t border-[#d6a15f]/20 bg-[#d6a15f]/10 px-4 py-3 text-sm">
                      <span className="font-extrabold text-[#d6a15f]" style={{ fontSize: '18px', lineHeight: 1.1 }}>Всего</span>
                      <span className="font-extrabold text-[#f0b45e]" style={{ fontSize: '18px', lineHeight: 1.1 }}><ResponsiveReportMoney value={checksTotal} /></span>
                    </div>
                  </>
                ) : <EmptyState text={isPeriodReport ? 'Чеков за период нет' : 'Чеков за день нет'} prominent />}
              </div>
            </div>
          </Section>}

        </>
      )}

      {afterFinancialReport && (
        <div className={status === 'ready' && dashboard ? 'space-y-6' : 'hidden'}>
          {afterFinancialReport}
        </div>
      )}

      {status === 'ready' && dashboard && (
        <>

          <div id="admin-bath-records" className="hidden scroll-mt-5 md:block"><Section eyebrow="Бани" title={isPeriodReport ? 'Записи и показатели по каждой бане за период' : 'Записи и показатели по каждой бане'}>
            <div className="space-y-3">
              {(dashboard.baths ?? []).map((bath) => {
                const isOpen = openBaths.has(bath.id);
                const kitchenTitles = new Set((bath.kitchenOrders ?? []).map((item) => item.title.trim().toLocaleLowerCase('ru-RU')));
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
                    <span className="flex flex-wrap items-center gap-3">
                      <span>{bath.title}</span>
                      {!recordsAvailable && <span className="rounded-full border border-[#d98a4a]/40 bg-[#2a1d12] px-3 py-1 text-xs uppercase tracking-[0.08em] text-[#e9a66e]">Нет данных</span>}
                    </span>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#d6a15f]/35 bg-[#15110d] text-[#d6a15f] transition-colors duration-300 ${isOpen ? 'bg-[#d6a15f]/10' : ''}`} aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={`h-6 w-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                  <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="min-h-0 overflow-hidden">
                    <div className={`border-t border-[#d6a15f]/20 p-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${isOpen ? 'translate-y-0' : '-translate-y-3'}`}>
                    {report && recordsAvailable && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      {[
                        ['Выручка с бани', formatMoney(bath.revenue)], ['Предоплаты', formatMoney(bath.prepayments)], ['Кухня', formatMoney(bath.kitchenRevenue)], ['Чеки КПП', formatMoney(bath.kppChecks)], ['Скидки', formatMoney(bath.discounts)],
                      ].map(([label, value]) => <div key={label} className="rounded-lg border border-[#d6a15f]/15 bg-[#15110d] p-3"><div className="text-base font-extrabold uppercase tracking-[0.08em] text-[#81776d]">{label}</div><div className="mt-2 text-[22px] font-extrabold text-[#f4eee4]">{value}</div></div>)}
                    </div>}
                    <div className="mt-4">
                      {!recordsAvailable ? (
                        <div className="rounded-lg border border-[#d98a4a]/35 bg-[#2a1d12] px-4 py-4 text-lg font-semibold text-[#e9a66e]">
                          Нет данных: записи YCLIENTS не загрузились. Повторная попытка выполняется автоматически.
                        </div>
                      ) : <>
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
                      </>}
                    </div>
                    </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </Section></div>

          {report && <><Section eyebrow="Кухня" title="Проданные блюда">
            <SalesTable rows={dashboard.kitchen?.sold ?? []} firstColumn="Блюдо" showStock={false} />
          </Section>
          <Section eyebrow="Кухня" title="Заказы без привязки к бане">
            <StandaloneKitchenOrders rows={dashboard.kitchen?.standaloneOrders ?? []} />
          </Section>
          <Section eyebrow="Кухня" title="Использованные расходники">
            <ConsumablesTable rows={dashboard.kitchen?.consumables ?? []} />
          </Section>
          <Section eyebrow="Пиво и напитки" title="Отдельные отчёты">
            <div className="space-y-7">
              <div><h3 className="mb-3 text-xl font-extrabold text-[#f4eee4]">Пиво</h3><SalesTable rows={dashboard.beer ?? []} firstColumn="Пиво" emptyText="Продаж пива за выбранный диапазон нет." /></div>
              <div><h3 className="mb-3 text-xl font-extrabold text-[#f4eee4]">Напитки</h3><SalesTable rows={dashboard.drinks ?? []} firstColumn="Напиток" emptyText="Продаж напитков за выбранный диапазон нет." /></div>
            </div>
          </Section>
          <Section eyebrow="Дополнительные услуги" title="Продажи дополнительных услуг"><SalesTable rows={dashboard.additionalServices ?? []} firstColumn="Дополнительная услуга" /></Section>
          <Section eyebrow="Товары" title="Проданные товары без пива и напитков"><SalesTable rows={dashboard.goods ?? []} firstColumn="Товар" /></Section></>}
          <Section eyebrow="Склады" title="Текущие остатки по всем складам"><StocksTable rows={dashboard.stocks ?? []} updatedAt={sourceUpdates['Склады YCLIENTS']} /></Section>
        </>
      )}
    </div>
  );
}
