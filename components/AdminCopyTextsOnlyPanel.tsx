'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminCopyTextsPanel, type AdminCopyData } from './AdminOperationsPanel';
import { shiftIsoDate } from '@/lib/adminDateRange';

type CopyTextsResponse = {
  ok: boolean;
  date?: string;
  copyText?: AdminCopyData['copyText'];
  generatedAt?: string;
  message?: string;
};

const localDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Vladivostok', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const buttonClass = 'inline-flex h-12 items-center justify-center rounded-lg border border-[#d6a15f]/50 px-4 text-sm font-extrabold uppercase tracking-[0.08em] text-[#f4eee4] transition hover:-translate-y-0.5 hover:border-[#d6a15f] hover:bg-[#d6a15f]/10 disabled:pointer-events-none disabled:opacity-55';

/** Панель для учётной записи, которой доступны только тексты занятости бань. */
export default function AdminCopyTextsOnlyPanel({
  manualRefreshKey = 0,
  onLoadingChange,
  onUpdatedAt,
}: {
  manualRefreshKey?: number;
  onLoadingChange?: (value: boolean) => void;
  onUpdatedAt?: (value: string) => void;
}) {
  const [today, setToday] = useState(localDate);
  const [selectedDate, setSelectedDate] = useState(today);
  const [data, setData] = useState<AdminCopyData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const notifyLoading = useCallback((value: boolean) => onLoadingChange?.(value), [onLoadingChange]);

  useEffect(() => {
    const timer = setInterval(() => setToday(localDate()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function load() {
      setStatus('loading');
      notifyLoading(true);
      setMessage('');
      try {
        const response = await fetch(`/api/admin/yclients?date=${selectedDate}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = (await response.json()) as CopyTextsResponse;
        if (ignore) return;

        if (!response.ok || !payload.ok || !payload.copyText) {
          setData(null);
          setStatus('error');
          setMessage(payload.message || 'Не удалось загрузить тексты занятости.');
          return;
        }

        setData({ selectedDate: payload.date ?? selectedDate, copyText: payload.copyText });
        setStatus('ready');
        if (payload.generatedAt) onUpdatedAt?.(payload.generatedAt);
      } catch (error) {
        if (ignore || (error instanceof DOMException && error.name === 'AbortError')) return;
        setData(null);
        setStatus('error');
        setMessage('Не удалось загрузить тексты занятости.');
      } finally {
        if (!ignore) notifyLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [selectedDate, manualRefreshKey, notifyLoading, onUpdatedAt]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#d6a15f]/20 bg-[#15110d] p-5 sm:p-7">
        <p className="text-lg font-extrabold uppercase tracking-[0.18em] text-[#d6a15f]">Дата</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className={buttonClass} onClick={() => setSelectedDate((value) => shiftIsoDate(value, -1))}>Назад</button>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value || today)}
            className="h-12 rounded-lg border border-[#d6a15f]/35 bg-[#0f0c09] px-4 text-base font-semibold text-[#f4eee4] outline-none transition focus:border-[#d6a15f]"
          />
          <button type="button" className={buttonClass} onClick={() => setSelectedDate((value) => shiftIsoDate(value, 1))}>Вперёд</button>
          <button type="button" className={buttonClass} onClick={() => setSelectedDate(today)}>Сегодня</button>
        </div>
        {status === 'loading' && <p className="mt-4 text-sm font-semibold text-[#b9aea0]">Загрузка…</p>}
        {status === 'error' && <p className="mt-4 text-sm font-semibold text-[#f0b45e]">{message}</p>}
      </section>
      <AdminCopyTextsPanel data={data} />
    </div>
  );
}
