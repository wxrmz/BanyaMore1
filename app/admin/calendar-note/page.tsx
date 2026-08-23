'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import AdminAvailabilityCalendar from '@/components/AdminAvailabilityCalendar';

type CalendarNoteResponse = {
  ok: boolean;
  text: string;
  maxLength: number;
  updatedAt: string | null;
  message?: string;
};

type SessionResponse = {
  ok: boolean;
  authenticated: boolean;
};

const defaultMaxLength = 180;

export default function CalendarNoteAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [text, setText] = useState('');
  const [maxLength, setMaxLength] = useState(defaultMaxLength);
  const [status, setStatus] = useState<'checking' | 'login' | 'loading' | 'ready' | 'saving' | 'saved' | 'error'>('checking');
  const [message, setMessage] = useState('');

  const remaining = useMemo(() => maxLength - text.length, [maxLength, text.length]);

  async function loadNote() {
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/calendar-note', { cache: 'no-store' });
      const payload = (await response.json()) as CalendarNoteResponse;

      setText(payload.text ?? '');
      setMaxLength(payload.maxLength || defaultMaxLength);
      setStatus('ready');
    } catch {
      setStatus('error');
      setMessage('Не удалось загрузить текст.');
    }
  }

  useEffect(() => {
    let ignore = false;

    async function checkSession() {
      try {
        const response = await fetch('/api/admin/session', { cache: 'no-store' });
        const payload = (await response.json()) as SessionResponse;

        if (ignore) {
          return;
        }

        if (response.ok && payload.authenticated) {
          setIsAuthenticated(true);
          await loadNote();
          return;
        }

        setStatus('login');
      } catch {
        if (!ignore) {
          setStatus('login');
        }
      }
    }

    checkSession();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('checking');
    setMessage('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Неверный логин или пароль.');
      }

      setIsAuthenticated(true);
      setPassword('');
      await loadNote();
    } catch (error) {
      setStatus('login');
      setMessage(error instanceof Error ? error.message : 'Не удалось войти.');
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setText('');
    setPassword('');
    setStatus('login');
    setMessage('');
  }

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
      setMessage(payload.text ? 'Текст опубликован под календарем.' : 'Текст скрыт с сайта.');
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
    <main className="min-h-screen bg-[#080706] px-4 py-8 text-[#f4eee4] sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center">
        {!isAuthenticated ? (
          <form
            onSubmit={handleLogin}
            className="mx-auto w-full max-w-3xl rounded-lg border border-[#d6a15f]/35 bg-[#15110d] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-7"
          >
            <p className="text-[13px] font-extrabold uppercase tracking-[0.18em] text-[#d6a15f]">Админ</p>
            <h1 className="mt-2 font-sans text-2xl font-extrabold text-[#f4eee4] sm:text-3xl">
              Вход в панель
            </h1>

            <label className="mt-6 block">
              <span className="text-sm font-bold uppercase tracking-[0.12em] text-[#b9aea0]">Логин</span>
              <input
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                autoComplete="username"
                className="mt-3 block h-12 w-full rounded-lg border border-[#d6a15f]/35 bg-[#0f0c09] px-4 text-base font-semibold text-[#f4eee4] outline-none transition focus:border-[#d6a15f]"
              />
            </label>

            <label className="mt-5 block">
              <span className="text-sm font-bold uppercase tracking-[0.12em] text-[#b9aea0]">Пароль</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="mt-3 block h-12 w-full rounded-lg border border-[#d6a15f]/35 bg-[#0f0c09] px-4 text-base font-semibold text-[#f4eee4] outline-none transition focus:border-[#d6a15f]"
              />
            </label>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-[24px] text-sm font-semibold text-[#f0b45e]">{message}</div>
              <button
                type="submit"
                disabled={status === 'checking'}
                className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-[#d6a15f] bg-[#d6a15f] px-5 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#15110d] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-55"
              >
                {status === 'checking' ? 'Проверка...' : 'Войти'}
              </button>
            </div>
          </form>
        ) : (
          <div className="w-full space-y-6">
            <AdminAvailabilityCalendar />
          <form
            onSubmit={handleSubmit}
            className="w-full rounded-lg border border-[#d6a15f]/35 bg-[#15110d] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-7"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[13px] font-extrabold uppercase tracking-[0.18em] text-[#d6a15f]">Админ</p>
                <h1 className="mt-2 font-sans text-2xl font-extrabold text-[#f4eee4] sm:text-3xl">
                  Текст под календарем
                </h1>
              </div>
              <div className={`text-sm font-bold ${remaining < 20 ? 'text-[#f0b45e]' : 'text-[#b9aea0]'}`}>
                Осталось {remaining}
              </div>
            </div>

            <label className="mt-6 block">
              <span className="text-sm font-bold uppercase tracking-[0.12em] text-[#b9aea0]">
                Сообщение для клиентов
              </span>
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
                  onClick={handleLogout}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-[#d6a15f]/30 px-5 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#b9aea0] transition hover:border-[#d6a15f]/60"
                >
                  Выйти
                </button>
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
          </div>
        )}
      </div>
    </main>
  );
}
