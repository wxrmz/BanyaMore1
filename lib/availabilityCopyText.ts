export type AvailabilitySlot = {
  time: string;
  available?: boolean;
  canStartBooking?: boolean;
  status?: 'free' | 'busy' | 'cleaning';
};

export type AvailabilityBath = {
  title: string;
  days?: Array<{ date: string; slots?: AvailabilitySlot[] }>;
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number) => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${Math.floor(normalized / 60)}`.padStart(2, '0') + ':' + `${normalized % 60}`.padStart(2, '0');
};

export function buildFreeWindowsFromAvailability(baths: AvailabilityBath[], date: string) {
  return baths.map((bath) => {
    const slots = [...(bath.days?.find((day) => day.date === date)?.slots ?? [])]
      .sort((left, right) => left.time.localeCompare(right.time));
    const runs: AvailabilitySlot[][] = [];
    let current: AvailabilitySlot[] = [];

    slots.forEach((slot) => {
      const isFree = slot.status === 'free' || slot.available === true;
      if (isFree) {
        current.push(slot);
        return;
      }
      if (current.length) runs.push(current);
      current = [];
    });
    if (current.length) runs.push(current);

    const bookableRuns = runs.filter((run) => run.some((slot) => slot.time !== '23:30' && slot.canStartBooking !== false));
    if (!bookableRuns.length) return `${bath.title}\nСвободных окон нет`;

    const lines = bookableRuns.map((run) => {
      const start = run[0].time;
      const last = run[run.length - 1];
      const endsAtDayBoundary = last.time === slots[slots.length - 1]?.time;
      return endsAtDayBoundary
        ? `с ${start}`
        : `с ${start} до ${minutesToTime(timeToMinutes(last.time) + 30)}`;
    });
    return `${bath.title}\n${lines.join('\n')}`;
  }).join('\n\n');
}
