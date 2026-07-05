import { NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, authenticated: await hasAdminSession() });
}
