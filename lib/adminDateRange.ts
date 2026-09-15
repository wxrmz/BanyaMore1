const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const VLADIVOSTOK_TIME_ZONE = 'Asia/Vladivostok';

export const MAX_ADMIN_REPORT_RANGE_DAYS = 366;
export const ADMIN_REPORT_MASK_SAFETY_MS = 1_000;
export const ADMIN_REPORT_REFRESH_GRACE_MS = 250;

const leapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

export function isValidIsoDate(value: string) {
  const match = value.match(ISO_DATE_PATTERN);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;

  const daysInMonth = [31, leapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

export function reportRangeDays(from: string, to: string) {
  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const toTime = Date.parse(`${to}T00:00:00Z`);
  return Math.floor((toTime - fromTime) / 86_400_000) + 1;
}

export const isAdminReportRangeWithinLimit = (from: string, to: string) => {
  const days = reportRangeDays(from, to);
  return days >= 1 && days <= MAX_ADMIN_REPORT_RANGE_DAYS;
};

export function getAdminReportDeadlineDelays(
  closesAt: string,
  serverNow: string,
  responseElapsedMs: number,
) {
  const remainingOnServer = Date.parse(closesAt) - Date.parse(serverNow);
  if (!Number.isFinite(remainingOnServer)) return null;

  // The response leg cannot be longer than the whole request. Subtracting the
  // measured request duration is deliberately conservative and does not depend
  // on the browser wall clock being correct.
  const networkUpperBound = Number.isFinite(responseElapsedMs)
    ? Math.max(0, responseElapsedMs)
    : 0;

  return {
    maskAfterMs: Math.max(
      0,
      remainingOnServer - networkUpperBound - ADMIN_REPORT_MASK_SAFETY_MS,
    ),
    refreshAfterMs: Math.max(0, remainingOnServer + ADMIN_REPORT_REFRESH_GRACE_MS),
  };
}

const vladivostokDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: VLADIVOSTOK_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const vladivostokTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: VLADIVOSTOK_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export const dateInVladivostok = (now = new Date()) => vladivostokDateFormatter.format(now);

const timeInVladivostok = (now: Date) => {
  const values = Object.fromEntries(
    vladivostokTimeFormatter
      .formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
};

export function shiftIsoDate(value: string, days: number) {
  if (!isValidIsoDate(value)) return '';
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export type AdminDailyReportAccess = {
  allowed: boolean;
  reason: 'today' | 'yesterday_before_noon' | 'closed';
  closesAt: string | null;
  today: string;
  yesterday: string;
};

export function getAdminDailyReportAccess(
  requestedDate: string,
  now = new Date(),
): AdminDailyReportAccess {
  const today = dateInVladivostok(now);
  const yesterday = shiftIsoDate(today, -1);
  const time = timeInVladivostok(now);
  const beforeNoon = time.hour < 12;

  if (requestedDate === today) {
    return { allowed: true, reason: 'today', closesAt: null, today, yesterday };
  }

  if (requestedDate === yesterday && beforeNoon) {
    return {
      allowed: true,
      reason: 'yesterday_before_noon',
      closesAt: new Date(`${today}T12:00:00+10:00`).toISOString(),
      today,
      yesterday,
    };
  }

  return { allowed: false, reason: 'closed', closesAt: null, today, yesterday };
}
