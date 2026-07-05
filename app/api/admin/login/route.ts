import { NextResponse } from 'next/server';
import { setAdminSessionCookie, validateAdminCredentials } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Некорректный JSON.' }, { status: 400 });
  }

  const login = typeof body === 'object' && body !== null && 'login' in body ? body.login : null;
  const password = typeof body === 'object' && body !== null && 'password' in body ? body.password : null;

  if (typeof login !== 'string' || typeof password !== 'string' || !validateAdminCredentials(login, password)) {
    return NextResponse.json({ ok: false, message: 'Неверный логин или пароль.' }, { status: 401 });
  }

  await setAdminSessionCookie();

  return NextResponse.json({ ok: true });
}
