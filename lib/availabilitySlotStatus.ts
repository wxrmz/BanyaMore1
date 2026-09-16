export type AvailabilitySlotStatus = {
  time: string;
  available: boolean;
  canStartBooking?: boolean;
  status?: 'free' | 'busy' | 'cleaning';
  service?: string;
  serviceId?: number;
  staff?: string;
  staffId?: number;
};

export type AvailabilityRecord = {
  staff_id?: number;
  datetime?: string;
  date?: string;
  seance_length?: number;
  length?: number;
  technical_break_duration?: number;
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const isoDayNumber = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
};

/**
 * Builds the visible timetable from exact YCLIENTS records. Book-times are
 * used only to mark starts that the widget actually accepts; their gaps must
 * not be interpreted as occupied time because a later booking also removes
 * several otherwise empty start options before it.
 */
export function buildExactAvailabilitySlotDays({
  dates,
  dayTimes,
  freeStartSlotsByDay,
  records,
  staffId,
  businessEnd = '23:30',
  slotStepMinutes = 30,
}: {
  dates: string[];
  dayTimes: string[];
  freeStartSlotsByDay: Map<string, AvailabilitySlotStatus>[];
  records: AvailabilityRecord[];
  staffId: number;
  businessEnd?: string;
  slotStepMinutes?: number;
}): AvailabilitySlotStatus[][] {
  const firstDay = isoDayNumber(dates[0]);
  const intervals = records.flatMap((record) => {
    if (Number(record.staff_id) !== staffId) return [];

    const dateTime = record.datetime ?? record.date ?? '';
    const match = /^(\d{4}-\d{2}-\d{2})[T\s](\d{1,2}):(\d{2})/.exec(dateTime);
    if (!match) return [];

    const start = (isoDayNumber(match[1]) - firstDay) * 1_440 + Number(match[2]) * 60 + Number(match[3]);
    const totalMinutes = Math.max(0, Math.round(Number(record.seance_length ?? record.length ?? 0) / 60));
    const cleaningMinutes = Math.min(
      totalMinutes,
      Math.max(0, Math.round(Number(record.technical_break_duration ?? 0) / 60)),
    );
    const serviceMinutes = Math.max(0, totalMinutes - cleaningMinutes);
    if (!serviceMinutes) return [];

    return [{
      busyStart: start,
      busyEnd: start + serviceMinutes,
      cleaningStart: start + serviceMinutes,
      cleaningEnd: start + serviceMinutes + cleaningMinutes,
    }];
  });

  return dates.map((_, dayIndex) => dayTimes.map((time) => {
    const slotStart = dayIndex * 1_440 + timeToMinutes(time);
    const slotEnd = slotStart + slotStepMinutes;
    const isBusy = intervals.some((interval) => slotStart < interval.busyEnd && slotEnd > interval.busyStart);

    if (isBusy) {
      return { time, available: false, canStartBooking: false, status: 'busy' as const };
    }

    const isCleaning = intervals.some(
      (interval) => slotStart < interval.cleaningEnd && slotEnd > interval.cleaningStart,
    );

    if (isCleaning) {
      return { time, available: false, canStartBooking: false, status: 'cleaning' as const };
    }

    const explicitStart = freeStartSlotsByDay[dayIndex]?.get(time);

    return {
      ...explicitStart,
      time,
      available: true,
      canStartBooking: Boolean(explicitStart) && time !== businessEnd,
      status: 'free' as const,
    };
  }));
}
