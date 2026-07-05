import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export const CALENDAR_NOTE_MAX_LENGTH = 180;

export type CalendarNote = {
  text: string;
  updatedAt: string | null;
};

const calendarNotePath = path.join(process.cwd(), 'data', 'calendar-note.json');

const emptyCalendarNote: CalendarNote = {
  text: '',
  updatedAt: null,
};

export const normalizeCalendarNoteText = (value: string) => value.replace(/\s+/g, ' ').trim();

export async function readCalendarNote(): Promise<CalendarNote> {
  try {
    const raw = await readFile(calendarNotePath, 'utf8');
    const data = JSON.parse(raw) as Partial<CalendarNote>;

    return {
      text: typeof data.text === 'string' ? normalizeCalendarNoteText(data.text) : '',
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
    };
  } catch {
    return emptyCalendarNote;
  }
}

export async function writeCalendarNote(text: string): Promise<CalendarNote> {
  const normalizedText = normalizeCalendarNoteText(text);

  if (normalizedText.length > CALENDAR_NOTE_MAX_LENGTH) {
    throw new Error(`Text is longer than ${CALENDAR_NOTE_MAX_LENGTH} characters.`);
  }

  const note: CalendarNote = {
    text: normalizedText,
    updatedAt: new Date().toISOString(),
  };

  await mkdir(path.dirname(calendarNotePath), { recursive: true });
  await writeFile(calendarNotePath, `${JSON.stringify(note, null, 2)}\n`, 'utf8');

  return note;
}
