import { NextResponse } from 'next/server';
import {
  CALENDAR_NOTE_MAX_LENGTH,
  readCalendarNote,
  writeCalendarNote,
} from '@/lib/calendarNote';
import { hasAdminSession } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const note = await readCalendarNote();

  return NextResponse.json({
    ok: true,
    maxLength: CALENDAR_NOTE_MAX_LENGTH,
    ...note,
  });
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json(
      { ok: false, message: 'Нужно войти в админ-панель.' },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Некорректный JSON.' },
      { status: 400 },
    );
  }

  const text = typeof body === 'object' && body !== null && 'text' in body ? body.text : null;

  if (typeof text !== 'string') {
    return NextResponse.json(
      { ok: false, message: 'Поле text обязательно.' },
      { status: 400 },
    );
  }

  try {
    const note = await writeCalendarNote(text);

    return NextResponse.json({
      ok: true,
      maxLength: CALENDAR_NOTE_MAX_LENGTH,
      ...note,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: `Текст должен быть не длиннее ${CALENDAR_NOTE_MAX_LENGTH} символов.` },
      { status: 400 },
    );
  }
}
