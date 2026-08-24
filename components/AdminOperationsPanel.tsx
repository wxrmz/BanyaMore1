'use client';

import { useEffect, useMemo, useState } from 'react';

type CatalogService = {
  id: number;
  title: string;
  price: number;
};

type AdminRecord = {
  id: number;
  datetime: string;
  date: string;
  time: string;
  durationMinutes: number;
  staff: string;
  client: { name: string; phone: string; email: string };
  services: Array<CatalogService & { discount: number; amount: number }>;
  total: number;
  comment: string;
  attendance: number;
  prepaid: boolean;
  paidFull: boolean;
};

type DailyReport = {
  date: string;
  income: number;
  expense: number;
  yclientsExpense: number;
  outsideShiftExpense: number;
  kppCompensation: number;
  prepayments: number;
  cashless: number;
  terminal: number;
  kitchenTerminalAdjustment: number;
  shiftTransfer: number;
  lateKitchenExcluded: number;
  surrendered: number;
  transactionCount: number;
};

type DashboardResponse = {
  ok: boolean;
  date?: string;
  records?: AdminRecord[];
  report?: DailyReport | null;
  kitchen?: CatalogService[];
  warnings?: Array<{ area: 'records' | 'finances'; code: string; message: string }>;
  message?: string;
};

const localDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const currency = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const formatMoney = (value: number) => currency.format(value || 0);

const durationLabel = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} ч ${remainder} мин` : `${hours} ч`;
};

const attendanceLabel = (value: number) => {
  if (value === 1) return 'Пришёл';
  if (value === 2) return 'Подтвердил';
  if (value === -1) return 'Не пришёл';
  return 'Ожидается';
};

const inputClass =
  'mt-2 block min-h-[46px] w-full rounded-lg border border-[#d6a15f]/35 bg-[#0f0c09] px-3 py-2 text-sm font-semibold text-[#f4eee4] outline-none transition focus:border-[#d6a15f]';

const fieldLabelClass = 'text-xs font-extrabold uppercase tracking-[0.12em] text-[#b9aea0]';

export default function AdminOperationsPanel() {
  const today = useMemo(localDate, []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [reloadKey, setReloadKey] = useState(0);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadMessage, setLoadMessage] = useState('');

  const [kitchenSelections, setKitchenSelections] = useState<Record<number, string>>({});
  const [kitchenSavingId, setKitchenSavingId] = useState<number | null>(null);
  const [recordMessage, setRecordMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setLoadStatus('loading');
      setLoadMessage('');

      try {
        const response = await fetch(`/api/admin/yclients?date=${selectedDate}`, { cache: 'no-store' });
        const payload = (await response.json()) as DashboardResponse;

        if (ignore) return;
        if (!response.ok || !payload.ok) {
          throw new Error(payload.message || 'Не удалось загрузить данные YCLIENTS.');
        }

        setDashboard(payload);
        setLoadStatus('ready');
      } catch (error) {
        if (!ignore) {
          setLoadStatus('error');
          setLoadMessage(error instanceof Error ? error.message : 'Не удалось загрузить данные YCLIENTS.');
        }
      }
    }

    loadDashboard();
    return () => {
      ignore = true;
    };
  }, [reloadKey, selectedDate]);

  const kitchen = dashboard?.kitchen ?? [];
  const records = dashboard?.records ?? [];

  async function addKitchen(recordId: number) {
    const selectedKitchenId = Number(kitchenSelections[recordId]);
    if (!selectedKitchenId) return;

    setKitchenSavingId(recordId);
    setRecordMessage('');

    try {
      const response = await fetch('/api/admin/yclients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-kitchen',
          recordId,
          serviceIds: [selectedKitchenId],
        }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Не удалось добавить блюдо.');
      }

      setKitchenSelections((current) => ({ ...current, [recordId]: '' }));
      setRecordMessage(`Запись №${recordId}: ${payload.message || 'блюдо добавлено.'}`);
      setReloadKey((value) => value + 1);
    } catch (error) {
      setRecordMessage(error instanceof Error ? error.message : 'Не удалось добавить блюдо.');
    } finally {
      setKitchenSavingId(null);
    }
  }

  const reportRows = dashboard?.report
    ? [
        { label: 'Приход', value: formatMoney(dashboard.report.income) },
        { label: 'Расход', value: formatMoney(dashboard.report.expense) },
        { label: 'Предоплаты', value: formatMoney(dashboard.report.prepayments) },
        {
          label: 'Безналичная оплата',
          value: `${formatMoney(dashboard.report.cashless)} (${formatMoney(dashboard.report.terminal)})`,
        },
        { label: 'Сдал', value: formatMoney(dashboard.report.surrendered), accent: true },
      ]
    : [];

  return (
    <section className="space-y-6" aria-label="Операции администратора">
      <div className="rounded-lg border border-[#d6a15f]/35 bg-[#15110d] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[13px] font-extrabold uppercase tracking-[0.18em] text-[#d6a15f]">YCLIENTS</p>
            <h1 className="mt-2 text-2xl font-extrabold text-[#f4eee4] sm:text-3xl">Рабочая панель</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#b9aea0]">
              Записи клиентов, кухня и дневной финансовый отчёт. Бронирование выполняется через календарь.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label>
              <span className={fieldLabelClass}>Рабочая дата</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className={`${inputClass} sm:w-[190px]`}
              />
            </label>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              disabled={loadStatus === 'loading'}
              className="inline-flex min-h-[46px] items-center justify-center rounded-lg border border-[#d6a15f]/50 px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#f4eee4] transition hover:border-[#d6a15f] disabled:opacity-55"
            >
              {loadStatus === 'loading' ? 'Загрузка...' : 'Обновить'}
            </button>
          </div>
        </div>

        {loadStatus === 'error' && (
          <div className="mt-5 rounded-lg border border-[#d56755]/45 bg-[#2a1512] px-4 py-3 text-sm font-semibold text-[#ef9b8d]">
            {loadMessage}
          </div>
        )}

        {dashboard?.warnings?.map((warning) => (
          <div
            key={`${warning.area}-${warning.code}`}
            className="mt-4 rounded-lg border border-[#d98a4a]/45 bg-[#24160d] px-4 py-3 text-sm font-semibold leading-6 text-[#e9a66e]"
          >
            <strong>{warning.area === 'records' ? 'Записи:' : 'Финансы:'}</strong> {warning.message}
            {warning.code === 'yclients_permissions' && (
              <span className="block text-[#cbbcac]">
                В YCLIENTS выдайте пользователю API права на просмотр и изменение записей, а также просмотр
                финансовых операций и отчёта по кассе за день.
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[#d6a15f]/35 bg-[#15110d] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-7">
        <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[13px] font-extrabold uppercase tracking-[0.18em] text-[#d6a15f]">Итоги дня</p>
              <h2 className="mt-2 text-xl font-extrabold text-[#f4eee4] sm:text-2xl">Дневной отчёт</h2>
            </div>
            {dashboard?.report && (
              <div className="text-right text-xs font-bold uppercase tracking-[0.1em] text-[#81776d]">
                {dashboard.report.transactionCount} операций
              </div>
            )}
        </div>

          {dashboard?.report ? (
            <div className="mt-5 overflow-hidden rounded-lg border border-[#d6a15f]/25">
              {reportRows.map((row) => (
                <div
                  key={row.label}
                  className={`flex flex-col gap-1 border-b border-[#d6a15f]/20 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between ${row.accent ? 'bg-[#d6a15f]/10' : ''}`}
                >
                  <span className={`font-bold ${row.accent ? 'text-[#d6a15f]' : 'text-[#b9aea0]'}`}>{row.label}:</span>
                  <span className={`text-lg font-extrabold ${row.accent ? 'text-[#f0b45e]' : 'text-[#f4eee4]'}`}>{row.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-[#d6a15f]/30 px-4 py-8 text-center text-sm font-semibold text-[#81776d]">
              Финансовые данные недоступны.
            </div>
          )}

          {dashboard?.report && (
            <div className="mt-4 grid gap-3 text-xs font-semibold leading-5 text-[#81776d] sm:grid-cols-2">
              <div className="rounded-lg border border-[#d6a15f]/20 bg-[#0f0c09] px-4 py-3">
                Расход: {formatMoney(dashboard.report.yclientsExpense)} по кассе +{' '}
                {formatMoney(dashboard.report.kppCompensation)} по акциям КПП.
                <span className="block text-[#b9aea0]">Учитываются операции из кассы «Наличные».</span>
                {dashboard.report.outsideShiftExpense > 0 && (
                  <span className="block text-[#b9aea0]">
                    В других кассах: {formatMoney(dashboard.report.outsideShiftExpense)} — в итог смены не входит.
                  </span>
                )}
              </div>
              <div className="rounded-lg border border-[#d6a15f]/20 bg-[#0f0c09] px-4 py-3">
                Сдал = приход − расход − предоплаты − весь безнал.
                {dashboard.report.shiftTransfer > 0 && (
                  <span className="block text-[#b9aea0]">
                    Продление после 02:00 перенесено в П/О: {formatMoney(dashboard.report.shiftTransfer)}.
                  </span>
                )}
                {dashboard.report.kitchenTerminalAdjustment > 0 && (
                  <span className="block text-[#b9aea0]">
                    Из терминала убран поздний перенос кухни:{' '}
                    {formatMoney(dashboard.report.kitchenTerminalAdjustment)}.
                  </span>
                )}
                {dashboard.report.lateKitchenExcluded > 0 && (
                  <span className="block text-[#b9aea0]">
                    Кухня, внесённая после закрытия смены: {formatMoney(dashboard.report.lateKitchenExcluded)}.
                  </span>
                )}
              </div>
              <p className="sm:col-span-2">
                Продление после 02:00 остаётся в приходе, но переносится из безнала в П/О. Расход округляется до
                ближайших 10 ₽; КПП одинаково добавляется в приход и расход.
              </p>
            </div>
          )}
      </div>

      <div className="rounded-lg border border-[#d6a15f]/35 bg-[#15110d] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[13px] font-extrabold uppercase tracking-[0.18em] text-[#d6a15f]">Записи клиентов</p>
            <h2 className="mt-2 text-xl font-extrabold text-[#f4eee4] sm:text-2xl">Обзор записи и кухня</h2>
          </div>
          <div className="text-sm font-bold text-[#81776d]">{records.length} записей</div>
        </div>

        {recordMessage && (
          <div className="mt-4 rounded-lg border border-[#d6a15f]/30 bg-[#0f0c09] px-4 py-3 text-sm font-semibold text-[#e9a66e]">
            {recordMessage}
          </div>
        )}

        {records.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {records.map((record) => (
              <article key={record.id} className="rounded-lg border border-[#d6a15f]/25 bg-[#0f0c09] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#d6a15f]">
                      {record.time || '—'} · {record.staff}
                    </div>
                    <h3 className="mt-1 text-lg font-extrabold text-[#f4eee4]">{record.client.name}</h3>
                    <div className="mt-1 text-sm font-semibold text-[#b9aea0]">
                      {record.client.phone || 'Телефон не указан'}
                      {record.client.email ? ` · ${record.client.email}` : ''}
                    </div>
                  </div>
                  <div className="rounded-full border border-[#d6a15f]/30 px-3 py-1 text-xs font-bold text-[#b9aea0]">
                    {attendanceLabel(record.attendance)}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-[#15110d] px-3 py-2">
                    <div className="text-xs font-bold uppercase tracking-[0.1em] text-[#81776d]">Длительность</div>
                    <div className="mt-1 font-extrabold text-[#f4eee4]">{durationLabel(record.durationMinutes)}</div>
                  </div>
                  <div className="rounded-lg bg-[#15110d] px-3 py-2">
                    <div className="text-xs font-bold uppercase tracking-[0.1em] text-[#81776d]">Сумма услуг</div>
                    <div className="mt-1 font-extrabold text-[#f4eee4]">{formatMoney(record.total)}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className={fieldLabelClass}>Выбранные услуги</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {record.services.length ? record.services.map((service, index) => (
                      <span key={`${service.id}-${index}`} className="rounded-full border border-[#d6a15f]/25 bg-[#15110d] px-3 py-1 text-xs font-bold text-[#cbbcac]">
                        {service.title} · {formatMoney(service.price)}
                      </span>
                    )) : <span className="text-sm font-semibold text-[#81776d]">Услуги не указаны</span>}
                  </div>
                </div>

                {record.comment && <p className="mt-4 text-sm font-semibold leading-6 text-[#b9aea0]">Комментарий: {record.comment}</p>}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <select
                    value={kitchenSelections[record.id] ?? ''}
                    onChange={(event) => setKitchenSelections((current) => ({ ...current, [record.id]: event.target.value }))}
                    className={`${inputClass} mt-0 flex-1`}
                  >
                    <option value="">Выберите блюдо кухни</option>
                    {kitchen.map((service) => (
                      <option key={service.id} value={service.id}>{service.title} — {formatMoney(service.price)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => addKitchen(record.id)}
                    disabled={!kitchenSelections[record.id] || kitchenSavingId === record.id}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-lg border border-[#d6a15f] px-4 text-xs font-extrabold uppercase tracking-[0.1em] text-[#d6a15f] transition hover:bg-[#d6a15f]/10 disabled:pointer-events-none disabled:opacity-45"
                  >
                    {kitchenSavingId === record.id ? 'Добавление...' : 'Добавить к записи'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-[#d6a15f]/30 px-4 py-10 text-center text-sm font-semibold text-[#81776d]">
            На выбранную дату записи не загружены.
          </div>
        )}
      </div>
    </section>
  );
}
