import { NextResponse } from 'next/server';
import { clearAdminSessionCookie, isSameOriginRequest } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Forbidden.' }, { status: 403 });
  }

  await clearAdminSessionCookie();

  return NextResponse.json({ ok: true });
}
