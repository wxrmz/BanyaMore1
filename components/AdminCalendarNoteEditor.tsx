'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type CalendarNoteResponse = {
  ok: boolean;
  text: string;
  maxLength: number;
  updatedAt: string | null;
  message?: string;
};

const defaultMaxLength = 180;

export default function AdminCalendarNoteEditor() {
  const [text, setText] = useState('');
  const [maxLength, setMaxLength] = useState(defaultMaxLength);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'saved' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const remaining = useMemo(() => maxLength - text.length, [maxLength, text.length]);

  useEffect(() => {
    let ignore = false;

    async function loadNote() {
      try {
        const response = await fetch('/api/calendar-note', { cache: 'no-store' });
        const payload = (await response.json()) as CalendarNoteResponse;

        if (!response.ok || !payload.ok) {
          throw new Error(payload.message || 'Не удалось загрузить текст.');
        }

        if (!ignore) {
          setText(payload.text ?? '');
          setMaxLength(payload.maxLength || defaultMaxLength);
          setStatus('ready');
        }
      } catch (error) {
        if (!ignore) {
          setStatus('error');
          setMessage(error instanceof Error ? error.message : 'Не удалось загрузить текст.');
        }
      }
    }

    loadNote();
    return () => {
      ignore = true;
    };
  }, []);

  async function saveNote(nextText: string) {
    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch('/api/calendar-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: nextText }),
      });
      const payload = (await response.json()) as CalendarNoteResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Не удалось сохранить текст.');
      }

      setText(payload.text ?? '');
      setMaxLength(payload.maxLength || defaultMaxLength);
      setStatus('saved');
      setMessage(payload.text ? 'Текст опубликован под календарём.' : 'Текст скрыт с сайта.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Не удалось сохранить текст.');
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveNote(text);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-lg border border-[#d6a15f]/35 bg-[#15110d] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-7"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-extrabold uppercase tracking-[0.18em] text-[#d6a15f]">Главная страница</p>
          <h2 className="mt-2 font-sans text-2xl font-extrabold text-[#f4eee4] sm:text-3xl">Текст под календарём</h2>
        </div>
        <div className={`text-sm font-bold ${remaining < 20 ? 'text-[#f0b45e]' : 'text-[#b9aea0]'}`}>
          Осталось {remaining}
        </div>
      </div>

      <label className="mt-6 block">
        <span className="text-sm font-bold uppercase tracking-[0.12em] text-[#b9aea0]">Сообщение для клиентов</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={maxLength}
          rows={5}
          className="mt-3 block w-full resize-none rounded-lg border border-[#d6a15f]/35 bg-[#0f0c09] px-4 py-3 text-base font-semibold leading-7 text-[#f4eee4] outline-none transition focus:border-[#d6a15f]"
          placeholder="Например: 7 июля баня работает до 20:00"
        />
      </label>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-[24px] text-sm font-semibold text-[#b9aea0]">
          {status === 'loading' ? 'Загрузка...' : message}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => saveNote('')}
            disabled={status === 'saving' || status === 'loading'}
            className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-[#d6a15f]/45 px-5 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#f4eee4] transition hover:border-[#d6a15f] disabled:pointer-events-none disabled:opacity-55"
          >
            Скрыть текст
          </button>
          <button
            type="submit"
            disabled={status === 'saving' || status === 'loading'}
            className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-[#d6a15f] bg-[#d6a15f] px-5 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#15110d] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-55"
          >
            {status === 'saving' ? 'Сохранение...' : 'Опубликовать'}
          </button>
        </div>
      </div>
    </form>
  );
}
