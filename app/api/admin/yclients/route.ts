import { NextResponse } from 'next/server';
import { hasAdminSession, isSameOriginRequest } from '@/lib/adminAuth';
import {
  addKitchenServices,
  getAdminCatalog,
  getDailyReport,
  getRecordsForDate,
  YclientsAdminError,
} from '@/lib/yclientsAdmin';

export const dynamic = 'force-dynamic';

const todayInVladivostok = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Vladivostok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const errorResponse = (error: unknown) => {
  if (error instanceof YclientsAdminError) {
    return NextResponse.json(
      { ok: false, code: error.code, message: error.message },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { ok: false, code: 'server_error', message: 'Не удалось выполнить операцию с YCLIENTS.' },
    { status: 500 },
  );
};

export async function GET(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ ok: false, message: 'Требуется вход в админ-панель.' }, { status: 401 });
  }

  const date = new URL(request.url).searchParams.get('date') || todayInVladivostok();

  if (!validDate(date)) {
    return NextResponse.json({ ok: false, message: 'Некорректная дата.' }, { status: 400 });
  }

  try {
    const catalog = await getAdminCatalog();
    const warnings: Array<{ area: 'records' | 'finances'; code: string; message: string }> = [];

    const records = await getRecordsForDate(date).catch((error: unknown) => {
      const knownError = error instanceof YclientsAdminError ? error : null;
      warnings.push({
        area: 'records',
        code: knownError?.code ?? 'yclients_error',
        message: knownError?.message ?? 'Не удалось загрузить записи из YCLIENTS.',
      });
      return [];
    });
    const report = await getDailyReport(
      date,
      catalog.kitchen.map((service) => service.id),
    ).catch((error: unknown) => {
      const knownError = error instanceof YclientsAdminError ? error : null;
      warnings.push({
        area: 'finances',
        code: knownError?.code ?? 'yclients_error',
        message: knownError?.message ?? 'Не удалось сформировать дневной отчёт.',
      });
      return null;
    });

    return NextResponse.json({
      ok: true,
      date,
      records,
      report,
      kitchen: catalog.kitchen,
      warnings,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ ok: false, message: 'Требуется вход в админ-панель.' }, { status: 401 });
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Недопустимый источник запроса.' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { action: 'add-kitchen'; recordId: number; serviceIds: number[] };

    if (body.action === 'add-kitchen') {
      const record = await addKitchenServices(Number(body.recordId), body.serviceIds.map(Number));
      return NextResponse.json({ ok: true, message: 'Услуги кухни добавлены в запись YCLIENTS.', record });
    }

    return NextResponse.json({ ok: false, message: 'Неизвестная операция.' }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
