import { NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/adminAuth';
import { getAdminDashboard, YclientsReportsError } from '@/lib/yclientsReports';

export const dynamic = 'force-dynamic';

const todayInVladivostok = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Vladivostok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00+10:00`));
const rangeDays = (from: string, to: string) =>
  Math.floor((Date.parse(`${to}T00:00:00+10:00`) - Date.parse(`${from}T00:00:00+10:00`)) / 86_400_000) + 1;

const errorResponse = (error: unknown) => {
  if (error instanceof YclientsReportsError) {
    return NextResponse.json(
      { ok: false, code: error.code, message: error.message },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { ok: false, code: 'server_error', message: 'Не удалось сформировать отчёты YCLIENTS.' },
    { status: 500 },
  );
};

export async function GET(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ ok: false, message: 'Требуется вход в админ-панель.' }, { status: 401 });
  }

  const search = new URL(request.url).searchParams;
  const date = search.get('date') || todayInVladivostok();
  const from = search.get('from') || date;
  const to = search.get('to') || from;

  if (![date, from, to].every(validDate)) {
    return NextResponse.json({ ok: false, message: 'Некорректная дата.' }, { status: 400 });
  }
  const days = rangeDays(from, to);
  if (days < 1) {
    return NextResponse.json({ ok: false, message: 'Дата начала периода должна быть не позже даты окончания.' }, { status: 400 });
  }
  if (days > 366) {
    return NextResponse.json({ ok: false, message: 'Период отчёта не может превышать 366 дней.' }, { status: 400 });
  }

  try {
    return NextResponse.json(await getAdminDashboard(date, from, to));
  } catch (error) {
    return errorResponse(error);
  }
}
