import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import {
  dateInVladivostok,
  getAdminDailyReportAccess,
  isAdminReportRangeWithinLimit,
  MAX_ADMIN_REPORT_RANGE_DAYS,
  isValidIsoDate,
  reportRangeDays,
} from '@/lib/adminDateRange';
import { getAdminAccess } from '@/lib/adminRoles';
import { stripClosedAdminReport } from '@/lib/adminDashboardAccess';
import { getAdminDashboard, YclientsReportsError } from '@/lib/yclientsReports';

export const dynamic = 'force-dynamic';

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
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ ok: false, message: 'Требуется вход в админ-панель.' }, { status: 401 });
  }

  const search = new URL(request.url).searchParams;
  const access = getAdminAccess(session.role);
  const requestTime = new Date();
  const date = search.get('date') || dateInVladivostok(requestTime);
  const from = search.get('from') || date;
  const to = search.get('to') || from;

  if (![date, from, to].every(isValidIsoDate)) {
    return NextResponse.json({ ok: false, message: 'Некорректная дата.' }, { status: 400 });
  }
  const days = reportRangeDays(from, to);
  if (days < 1) {
    return NextResponse.json({ ok: false, message: 'Дата начала периода должна быть не позже даты окончания.' }, { status: 400 });
  }
  if (!access.periodReports && !isAdminReportRangeWithinLimit(from, to)) {
    return NextResponse.json(
      { ok: false, message: `Период отчёта не может превышать ${MAX_ADMIN_REPORT_RANGE_DAYS} дней.` },
      { status: 400 },
    );
  }
  if (date < from || date > to) {
    return NextResponse.json({ ok: false, message: 'Дата расписания должна входить в выбранный период.' }, { status: 400 });
  }
  if (!access.periodReports && (from !== to || date !== from)) {
    return NextResponse.json(
      { ok: false, message: 'Отчёты за период доступны владельцу и директору.' },
      { status: 403 },
    );
  }
  try {
    const dailyAccess = session.role === 'admin'
      ? getAdminDailyReportAccess(date, requestTime)
      : { allowed: true, reason: 'today' as const, closesAt: null, today: dateInVladivostok(requestTime), yesterday: '' };
    const dashboard = await getAdminDashboard(date, from, to, {
      includeReports: access.fullReports || dailyAccess.allowed,
    });
    const responseTime = new Date();
    const finalDailyAccess = session.role === 'admin'
      ? getAdminDailyReportAccess(date, responseTime)
      : dailyAccess;
    const reportAllowed = access.fullReports || finalDailyAccess.allowed;
    const safeDashboard = reportAllowed
      ? dashboard
      : stripClosedAdminReport(dashboard);

    return NextResponse.json({
      ...safeDashboard,
      reportAccess: {
        allowed: reportAllowed,
        reason: access.fullReports ? 'full_access' : finalDailyAccess.reason,
        closesAt: access.fullReports ? null : finalDailyAccess.closesAt,
        serverNow: responseTime.toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
