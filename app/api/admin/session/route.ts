import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import { getAdminAccess } from '@/lib/adminRoles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ ok: true, authenticated: false });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    role: session.role,
    access: getAdminAccess(session.role),
  });
}
