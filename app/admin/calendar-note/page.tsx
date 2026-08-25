'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import AdminAvailabilityCalendar from '@/components/AdminAvailabilityCalendar';
import AdminCalendarNoteEditor from '@/components/AdminCalendarNoteEditor';
import AdminOperationsPanel, { AdminCopyTextsPanel, type AdminCopyData } from '@/components/AdminOperationsPanel';

type SessionResponse = { ok: boolean; authenticated: boolean };

export default function AdminReportsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [status, setStatus] = useState<'checking' | 'login' | 'ready'>('checking');
  const [message, setMessage] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [copyData, setCopyData] = useState<AdminCopyData | null>(null);

  const handleUpdatedAt = useCallback((value: string) => {
    setUpdatedAt((current) => {
      if (!current) return value;
      return Date.parse(value) >= Date.parse(current) ? value : current;
    });
  }, []);
  const handleCopyData = useCallback((value: AdminCopyData | null) => setCopyData(value), []);

  useEffect(() => {
    let ignore = false;
    async function checkSession() {
      try {
        const response = await fetch('/api/admin/session', { cache: 'no-store' });
        const payload = (await response.json()) as SessionResponse;
        if (ignore) return;
        if (response.ok && payload.authenticated) {
          setIsAuthenticated(true);
          setStatus('ready');
        } else {
          setStatus('login');
        }
      } catch {
        if (!ignore) setStatus('login');
      }
    }
    checkSession();
    return () => { ignore = true; };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('checking');
    setMessage('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password, remember }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.message || 'Неверный логин или пароль.');
      setIsAuthenticated(true);
      setPassword('');
      setStatus('ready');
    } catch (error) {
      setStatus('login');
      setMessage(error instanceof Error ? error.message : 'Не удалось войти.');
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setPassword('');
    setStatus('login');
    setMessage('');
    setUpdatedAt('');
    setCopyData(null);
  }

  return (
    <main className="admin-page min-h-screen bg-[#080706] px-4 py-8 text-[#f4eee4] sm:px-6 lg:px-10">
      {!isAuthenticated ? (
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center">
          <form onSubmit={handleLogin} className="w-full rounded-lg border border-[#d6a15f]/35 bg-[#15110d] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-7">
            <p className="text-[13px] font-extrabold uppercase tracking-[0.18em] text-[#d6a15f]">Баня-Море</p>
            <h1 className="mt-2 font-sans text-2xl font-extrabold text-[#f4eee4] sm:text-3xl">Вход в отчётную панель</h1>
            <label className="mt-6 block">
              <span className="text-sm font-bold uppercase tracking-[0.12em] text-[#b9aea0]">Логин</span>
              <input value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" className="mt-3 block h-12 w-full rounded-lg border border-[#d6a15f]/35 bg-[#0f0c09] px-4 text-base font-semibold text-[#f4eee4] outline-none transition focus:border-[#d6a15f]" />
            </label>
            <label className="mt-5 block">
              <span className="text-sm font-bold uppercase tracking-[0.12em] text-[#b9aea0]">Пароль</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="mt-3 block h-12 w-full rounded-lg border border-[#d6a15f]/35 bg-[#0f0c09] px-4 text-base font-semibold text-[#f4eee4] outline-none transition focus:border-[#d6a15f]" />
            </label>
            <label className="mt-5 inline-flex cursor-pointer items-center gap-3 text-sm font-bold text-[#b9aea0]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-5 w-5 accent-[#d6a15f]"
              />
              <span>Запомнить вход на 30 дней</span>
            </label>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-[24px] text-sm font-semibold text-[#f0b45e]">{message}</div>
              <button type="submit" disabled={status === 'checking'} className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-[#d6a15f] bg-[#d6a15f] px-5 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#15110d] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-55">
                {status === 'checking' ? 'Проверка...' : 'Войти'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[1500px]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end sm:gap-6">
            <div aria-live="polite" className="text-lg font-extrabold text-[#b9aea0] sm:text-xl">
              {updatedAt
                ? `Обновлено в ${new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(updatedAt))}`
                : 'Данные обновляются…'}
            </div>
            <button type="button" onClick={handleLogout} className="inline-flex min-h-[52px] min-w-[130px] items-center justify-center rounded-lg border border-[#d6a15f]/50 px-6 text-xl font-extrabold uppercase tracking-[0.14em] text-[#f4eee4] transition hover:-translate-y-0.5 hover:border-[#d6a15f] hover:bg-[#d6a15f]/10">Выйти</button>
          </div>
          <div className="space-y-6">
            <AdminOperationsPanel onUpdatedAt={handleUpdatedAt} onCopyData={handleCopyData} />
            <AdminAvailabilityCalendar onUpdatedAt={handleUpdatedAt} />
            <AdminCopyTextsPanel data={copyData} />
            <AdminCalendarNoteEditor />
          </div>
        </div>
      )}
    </main>
  );
}
