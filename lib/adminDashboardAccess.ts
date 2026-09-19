import type { AdminDashboard } from './yclientsReports';

/** Ответ для учётной записи, которой доступны только тексты занятости бань. */
export type CopyTextsOnlyDashboard = Pick<AdminDashboard, 'ok' | 'date' | 'range' | 'copyText' | 'generatedAt'>;

/** Оставляет только тексты для копирования: выручка, записи и остатки не покидают сервер. */
export function stripToCopyTexts(dashboard: AdminDashboard): CopyTextsOnlyDashboard {
  return {
    ok: dashboard.ok,
    date: dashboard.date,
    range: dashboard.range,
    copyText: dashboard.copyText,
    generatedAt: dashboard.generatedAt,
  };
}
