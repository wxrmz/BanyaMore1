import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type YclientsEnvelope<T> = {
  success?: boolean;
  data?: T;
  meta?: unknown;
};

type YclientsService = {
  id?: number;
  category_id?: number;
  title?: string;
  name?: string;
  booking_title?: string;
  seance_length?: number;
  active?: boolean;
};

type YclientsStaff = {
  id?: number;
  name?: string;
  specialization?: string;
  bookable?: boolean;
  fired?: boolean;
};

type RawTimeSlot =
  | string
  | {
      time?: string;
      datetime?: string;
      seance_date?: string;
      timestamp?: number;
      staff_id?: number;
      staff_name?: string;
      service_id?: number;
      service_title?: string;
    };

type PublicSlot = {
  time: string;
  available: boolean;
  canStartBooking?: boolean;
  status?: 'free' | 'busy' | 'cleaning';
  service?: string;
  serviceId?: number;
  staff?: string;
  staffId?: number;
};

type PublicDay = {
  date: string;
  label: string;
  weekday: string;
  freeCount: number;
  slots: PublicSlot[];
};

type PublicBath = {
  id: string;
  title: string;
  freeCount: number;
  staffId: number;
  bookingServices: BookingService[];
  days: PublicDay[];
};

type BookingService = {
  durationMinutes: number;
  label: string;
  serviceId: number;
};

type BathConfig = {
  id: string;
  title: string;
  serviceId: number;
  staffId: number;
  durationMinutes: number;
  bookingServices: BookingService[];
};

const API_BASE = 'https://api.yclients.com/api/v1';
const COMPANY_ID = process.env.YCLIENTS_COMPANY_ID ?? '1300176';
const TIMEZONE = 'Asia/Vladivostok';
const BOOKING_URL = process.env.YCLIENTS_BOOKING_URL ?? 'https://n1437834.yclients.com/';
const BUSINESS_START = '00:00';
const BUSINESS_END = '23:30';
const SLOT_STEP_MINUTES = 30;
const CLEANING_MINUTES = 30;
const BOOKING_SERVICE_DURATIONS = [
  { durationMinutes: 120, label: '2 часа' },
  { durationMinutes: 150, label: '2 часа 30 минут' },
  { durationMinutes: 180, label: '3 часа' },
  { durationMinutes: 210, label: '3 часа 30 минут' },
  { durationMinutes: 240, label: '4 часа' },
  { durationMinutes: 270, label: '4 часа 30 минут' },
  { durationMinutes: 300, label: '5 часов' },
  { durationMinutes: 330, label: '5 часов 30 минут' },
  { durationMinutes: 360, label: '6 часов' },
  { durationMinutes: 390, label: '6 часов 30 минут' },
  { durationMinutes: 420, label: '7 часов' },
  { durationMinutes: 450, label: '7 часов 30 минут' },
  { durationMinutes: 480, label: '8 часов' },
  { durationMinutes: 510, label: '8 часов 30 минут' },
  { durationMinutes: 540, label: '9 часов' },
  { durationMinutes: 570, label: '9 часов 30 минут' },
  { durationMinutes: 600, label: '10 часов' },
];

const makeBookingServices = (serviceIds: number[]) =>
  BOOKING_SERVICE_DURATIONS.map((duration, index) => ({
    ...duration,
    serviceId: serviceIds[index],
  })).filter((service) => Number.isFinite(service.serviceId));
const DEFAULT_BATHS: BathConfig[] = [
  {
    id: 'small',
    title: 'Малая баня',
    serviceId: Number(process.env.YCLIENTS_SMALL_BATH_SERVICE_ID ?? 20671398),
    staffId: Number(process.env.YCLIENTS_SMALL_BATH_STAFF_ID ?? 3872281),
    durationMinutes: Number(process.env.YCLIENTS_SMALL_BATH_DURATION_MINUTES ?? 120),
    bookingServices: makeBookingServices([
      20671398, 20671401, 20671404, 20671407, 20671410, 20671413, 20671416, 20671419, 20671422,
      20671428, 20671431, 20671434, 20671440, 20671443, 20671449, 20671455, 20671386,
    ]),
  },
  {
    id: 'big-1',
    title: 'Большая баня 1',
    serviceId: Number(process.env.YCLIENTS_BIG_BATH_1_SERVICE_ID ?? 20671209),
    staffId: Number(process.env.YCLIENTS_BIG_BATH_1_STAFF_ID ?? 3873893),
    durationMinutes: Number(process.env.YCLIENTS_BIG_BATH_1_DURATION_MINUTES ?? 120),
    bookingServices: makeBookingServices([
      20671209, 20671212, 20671215, 20671218, 20671221, 20671224, 20671227, 20671230, 20671233,
      20671236, 20671239, 20671242, 20671248, 20671251, 20671260, 20671266, 20671200,
    ]),
  },
  {
    id: 'big-2',
    title: 'Большая баня 2',
    serviceId: Number(process.env.YCLIENTS_BIG_BATH_2_SERVICE_ID ?? 20671305),
    staffId: Number(process.env.YCLIENTS_BIG_BATH_2_STAFF_ID ?? 3873916),
    durationMinutes: Number(process.env.YCLIENTS_BIG_BATH_2_DURATION_MINUTES ?? 120),
    bookingServices: makeBookingServices([
      20671305, 20671308, 20671314, 20671317, 20671323, 20671326, 20671332, 20671335, 20671341,
      20671344, 20671347, 20671350, 20671353, 20671356, 20671362, 20671365, 20671299,
    ]),
  },
];

const toList = (value?: string) =>
  value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: TIMEZONE,
  }).format(new Date(`${date}T00:00:00+10:00`));

const weekdayLabel = (date: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    timeZone: TIMEZONE,
  }).format(new Date(`${date}T00:00:00+10:00`));

const makeDayTimes = () => {
  const [startHour, startMinute] = BUSINESS_START.split(':').map(Number);
  const [endHour, endMinute] = BUSINESS_END.split(':').map(Number);
  const result: string[] = [];
  let cursor = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  while (cursor <= end) {
    const hours = `${Math.floor(cursor / 60)}`.padStart(2, '0');
    const minutes = `${cursor % 60}`.padStart(2, '0');
    result.push(`${hours}:${minutes}`);
    cursor += SLOT_STEP_MINUTES;
  }

  return result;
};

const countBookableSlots = (slots: PublicSlot[]) =>
  slots.filter((slot) => slot.available && slot.canStartBooking !== false).length;

const normalizeEnvelope = <T>(payload: YclientsEnvelope<T> | T): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as YclientsEnvelope<T>).data as T;
  }

  return payload as T;
};

const partnerToken = () => process.env.YCLIENTS_PARTNER_TOKEN ?? process.env.YCLIENTS_API_KEY;

const authHeaders = () => {
  const userToken = process.env.YCLIENTS_USER_TOKEN;

  return {
    Accept: 'application/vnd.yclients.v2+json',
    'Content-Type': 'application/json',
    Authorization: userToken ? `Bearer ${partnerToken()}, User ${userToken}` : `Bearer ${partnerToken()}`,
  };
};

async function fetchYclients<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as YclientsEnvelope<T> | T;
  return normalizeEnvelope<T>(json);
}

async function firstSuccessful<T>(paths: string[]) {
  for (const path of paths) {
    const payload = await fetchYclients<T>(path);

    if (payload) {
      return payload;
    }
  }

  return null;
}

const serviceTitle = (service: YclientsService) => service.booking_title ?? service.title ?? service.name ?? 'Баня Море';

const pickRepresentativeServices = (services: YclientsService[]) => {
  const byCategory = new Map<number, YclientsService[]>();

  services.forEach((service) => {
    const categoryId = service.category_id ?? 0;
    byCategory.set(categoryId, [...(byCategory.get(categoryId) ?? []), service]);
  });

  return Array.from(byCategory.values()).map((items) => {
    const exactTwoHours = items.find((service) => /^аренда\s+2ч$/i.test(serviceTitle(service).trim()));
    return exactTwoHours ?? items[0];
  });
};

async function getServices() {
  const envIds = toList(process.env.YCLIENTS_SERVICE_IDS);

  if (envIds.length > 0) {
    return envIds.map((id) => ({ id: Number(id), title: 'Баня Море' }));
  }

  const payload = await firstSuccessful<YclientsService[] | { services?: YclientsService[] }>([
    `/book_services/${COMPANY_ID}`,
    `/company/${COMPANY_ID}/services`,
  ]);

  const services = Array.isArray(payload) ? payload : payload?.services ?? [];

  const activeServices = services
    .filter((service) => service.id && service.active !== false)
    .slice(0, 60);

  return pickRepresentativeServices(activeServices)
    .map((service) => ({
      id: Number(service.id),
      title: serviceTitle(service),
    }))
    .slice(0, 6);
}

async function getStaff() {
  const envIds = toList(process.env.YCLIENTS_STAFF_IDS);

  if (envIds.length > 0) {
    return envIds.map((id) => ({ id: Number(id), name: 'Специалист' }));
  }

  const payload = await firstSuccessful<YclientsStaff[] | { staff?: YclientsStaff[] }>([
    `/book_staff/${COMPANY_ID}`,
    `/company/${COMPANY_ID}/staff`,
  ]);

  const staff = Array.isArray(payload) ? payload : payload?.staff ?? [];

  return staff
    .filter((person) => person.id && person.fired !== true && person.bookable !== false)
    .map((person) => ({
      id: Number(person.id),
      name: person.name ?? person.specialization ?? 'Специалист',
    }))
    .slice(0, 12);
}

const timeFromSlot = (slot: RawTimeSlot) => {
  if (typeof slot === 'string') {
    return normalizeTime(slot);
  }

  const value = slot.time ?? slot.datetime ?? slot.seance_date;

  if (value) {
    return normalizeTime(value);
  }

  if (slot.timestamp) {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: TIMEZONE,
    }).format(new Date(slot.timestamp * 1000));
  }

  return null;
};

const normalizeTime = (value: string) => {
  const match = value.match(/(\d{1,2}):(\d{2})/);

  if (!match) {
    return null;
  }

  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

async function runPool<T>(tasks: (() => Promise<T>)[], limit: number) {
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < tasks.length; index += limit) {
      await tasks[index]();
    }
  });

  await Promise.all(workers);
}

async function fetchFreeSlots(date: string, services: Awaited<ReturnType<typeof getServices>>, staff: Awaited<ReturnType<typeof getStaff>>) {
  const slots = new Map<string, PublicSlot>();
  const staffCandidates = staff.length > 0 ? staff : [{ id: 0, name: 'Любой специалист' }];
  const tasks = services.flatMap((service) =>
    staffCandidates.map(() => async () => undefined),
  );

  let taskIndex = 0;
  let successfulRequests = 0;
  let failedRequests = 0;

  services.forEach((service) => {
    staffCandidates.forEach((person) => {
      tasks[taskIndex] = async () => {
        const payload = await fetchYclients<RawTimeSlot[] | { times?: RawTimeSlot[]; slots?: RawTimeSlot[] }>(
          `/book_times/${COMPANY_ID}/${person.id}/${date}?service_ids[]=${service.id}`,
        );

        if (!payload) {
          failedRequests += 1;
          return;
        }

        successfulRequests += 1;
        const rawSlots = Array.isArray(payload) ? payload : payload?.times ?? payload?.slots ?? [];

        rawSlots.forEach((slot) => {
          const time = timeFromSlot(slot);

          if (!time) {
            return;
          }

          slots.set(time, {
            time,
            available: true,
            canStartBooking: true,
            service: service.title,
            serviceId: service.id,
            staff: typeof slot === 'string' ? person.name : slot.staff_name ?? person.name,
            staffId: person.id,
          });
        });
      };
      taskIndex += 1;
    });
  });

  await runPool(tasks, 4);

  if (failedRequests > 0 || successfulRequests === 0) {
    throw new Error(`YCLIENTS availability request failed for ${date}`);
  }

  return slots;
}

function buildActualAvailabilitySlotDays(freeStartSlotsByDay: Map<string, PublicSlot>[], durationMinutes: number) {
  const dayTimes = makeDayTimes();
  const dayLength = dayTimes.length;
  const startAvailability = freeStartSlotsByDay.flatMap((freeStartSlots) => dayTimes.map((time) => freeStartSlots.has(time)));

  if (startAvailability.every((available) => !available)) {
    return freeStartSlotsByDay.map(() =>
      dayTimes.map((time) => ({ time, available: false, canStartBooking: false, status: 'busy' as const })),
    );
  }

  const actualAvailability = dayTimes.map(() => true);
  while (actualAvailability.length < startAvailability.length) {
    actualAvailability.push(true);
  }
  const cleaningSlots = actualAvailability.map(() => false);
  const shiftSlots = Math.max(1, Math.round(durationMinutes / SLOT_STEP_MINUTES));
  const cleaningSlotsCount = Math.max(1, Math.round(CLEANING_MINUTES / SLOT_STEP_MINUTES));
  const requiredStartSlots = shiftSlots + cleaningSlotsCount;

  const busyRuns: Array<{ start: number; endExclusive: number }> = [];

  for (let index = 0; index < startAvailability.length; index += 1) {
    if (startAvailability[index]) {
      continue;
    }

    const runStart = index;

    while (index + 1 < startAvailability.length && !startAvailability[index + 1]) {
      index += 1;
    }

    const runEnd = index;
    const hasFreeBefore = runStart > 0 && startAvailability[runStart - 1];
    const actualStart = hasFreeBefore ? Math.min(runStart + shiftSlots, startAvailability.length) : runStart;
    const actualEnd = Math.max(actualStart, runEnd - cleaningSlotsCount + 1);

    busyRuns.push({ start: actualStart, endExclusive: actualEnd });

    for (let busyIndex = actualStart; busyIndex < actualEnd; busyIndex += 1) {
      actualAvailability[busyIndex] = false;
    }
  }

  busyRuns.forEach(({ start, endExclusive }) => {
    for (let offset = 1; offset <= cleaningSlotsCount; offset += 1) {
      const cleaningIndex = start - offset;

      if (cleaningIndex >= 0 && actualAvailability[cleaningIndex]) {
        cleaningSlots[cleaningIndex] = true;
      }
    }

    for (let offset = 1; offset <= cleaningSlotsCount; offset += 1) {
      const cleaningIndex = endExclusive + offset - 1;

      if (cleaningIndex < actualAvailability.length && actualAvailability[cleaningIndex]) {
        cleaningSlots[cleaningIndex] = true;
      }
    }
  });

  const firstFreeStart = freeStartSlotsByDay.find((freeStartSlots) => freeStartSlots.size > 0)?.values().next().value;

  return freeStartSlotsByDay.map((freeStartSlots, dayIndex) =>
    dayTimes.map((time, timeIndex) => {
    const index = dayIndex * dayLength + timeIndex;
    const originalSlot = freeStartSlots.get(time);

    if (cleaningSlots[index]) {
      return {
        time,
        available: false,
        canStartBooking: false,
        status: 'cleaning' as const,
      };
    }

    const canStartBooking = Array.from({ length: requiredStartSlots }, (_, offset) => index + offset).every(
      (slotIndex) => slotIndex < actualAvailability.length && actualAvailability[slotIndex] && !cleaningSlots[slotIndex],
    );

    return actualAvailability[index]
      ? {
          time,
          available: true,
          canStartBooking: freeStartSlots.has(time) && canStartBooking,
          status: 'free' as const,
          service: originalSlot?.service ?? firstFreeStart?.service,
          serviceId: originalSlot?.serviceId ?? firstFreeStart?.serviceId,
          staff: originalSlot?.staff ?? firstFreeStart?.staff,
          staffId: originalSlot?.staffId ?? firstFreeStart?.staffId,
        }
      : { time, available: false, canStartBooking: false, status: 'busy' as const };
  }),
  );
}

function buildActualAvailabilitySlots(freeStartSlots: Map<string, PublicSlot>, durationMinutes: number) {
  return buildActualAvailabilitySlotDays([freeStartSlots], durationMinutes)[0] ?? [];
}

async function buildDay(
  date: string,
  services: Awaited<ReturnType<typeof getServices>>,
  staff: Awaited<ReturnType<typeof getStaff>>,
  durationMinutes = 0,
): Promise<PublicDay> {
  const freeSlots = await fetchFreeSlots(date, services, staff);
  const slots =
    durationMinutes > 0
      ? buildActualAvailabilitySlots(freeSlots, durationMinutes)
      : makeDayTimes().map((time) => freeSlots.get(time) ?? { time, available: false });

  return {
    date,
    label: dayLabel(date),
    weekday: weekdayLabel(date),
    freeCount: countBookableSlots(slots),
    slots,
  };
}

async function buildBathAvailability(bath: BathConfig, dates: string[]): Promise<PublicBath> {
  const service = { id: bath.serviceId, title: bath.title };
  const staff = { id: bath.staffId, name: bath.title };
  const lookaheadDate = formatDate(addDays(new Date(`${dates[dates.length - 1]}T00:00:00+10:00`), 1));
  const datesWithLookahead = [...dates, lookaheadDate];
  const freeSlotsByDay = await Promise.all(datesWithLookahead.map((date) => fetchFreeSlots(date, [service], [staff])));
  const slotDays = buildActualAvailabilitySlotDays(freeSlotsByDay, bath.durationMinutes);
  const days = dates.map((date, index) => {
    const slots = slotDays[index] ?? [];

    return {
      date,
      label: dayLabel(date),
      weekday: weekdayLabel(date),
      freeCount: countBookableSlots(slots),
      slots,
    };
  });

  return {
    id: bath.id,
    title: bath.title,
    freeCount: days.reduce((sum, day) => sum + day.freeCount, 0),
    staffId: bath.staffId,
    bookingServices: bath.bookingServices,
    days,
  };
}

function mergeBathDays(baths: PublicBath[], dates: string[]): PublicDay[] {
  return dates.map((date) => {
    const dayByBath = baths
      .map((bath) => ({
        bath,
        day: bath.days.find((item) => item.date === date),
      }))
      .filter((item): item is { bath: PublicBath; day: PublicDay } => Boolean(item.day));

    const slots = makeDayTimes().map((time) => {
      const availableBath = dayByBath.find(({ day }) => day.slots.some((slot) => slot.time === time && slot.available));

      return availableBath
        ? {
            time,
            available: true,
            canStartBooking: availableBath.day.slots.some((slot) => slot.time === time && slot.canStartBooking),
            status: 'free' as const,
            service: availableBath.bath.title,
            serviceId: availableBath.bath.bookingServices[0]?.serviceId,
            staff: availableBath.bath.title,
            staffId: availableBath.bath.staffId,
          }
        : { time, available: false, canStartBooking: false, status: 'busy' as const };
    });

    return {
      date,
      label: dayLabel(date),
      weekday: weekdayLabel(date),
      freeCount: countBookableSlots(slots),
      slots,
    };
  });
}

export async function GET(request: Request) {
  if (!partnerToken()) {
    return NextResponse.json(
      {
        ok: false,
        bookingUrl: BOOKING_URL,
        message: 'Availability calendar is not configured yet.',
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ?? formatDate(new Date());
  const days = Math.min(Math.max(Number(searchParams.get('days') ?? 7), 1), 14);
  const start = new Date(`${from}T00:00:00+10:00`);

  try {
    const bathConfigs = DEFAULT_BATHS.filter((bath) => Number.isFinite(bath.serviceId) && Number.isFinite(bath.staffId));

    if (bathConfigs.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          bookingUrl: BOOKING_URL,
          message: 'Availability calendar is temporarily unavailable.',
        },
        { status: 502 },
      );
    }

    const dates = Array.from({ length: days }, (_, index) => formatDate(addDays(start, index)));
    const baths = await Promise.all(bathConfigs.map((bath) => buildBathAvailability(bath, dates)));
    const availability = mergeBathDays(baths, dates);

    return NextResponse.json({
      ok: true,
      companyId: COMPANY_ID,
      bookingUrl: BOOKING_URL,
      generatedAt: new Date().toISOString(),
      baths,
      days: availability,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        bookingUrl: BOOKING_URL,
        message: 'Availability calendar is temporarily unavailable.',
      },
      { status: 502 },
    );
  }
}
