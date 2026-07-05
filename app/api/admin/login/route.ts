import { NextResponse } from 'next/server';
import {
  clearFailedLogins,
  getClientRateLimitKey,
  isAdminAuthConfigured,
  isLoginRateLimited,
  isSameOriginRequest,
  recordFailedLogin,
  setAdminSessionCookie,
  validateAdminCredentials,
} from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Forbidden.' }, { status: 403 });
  }

  if (!isAdminAuthConfigured()) {
    return NextResponse.json({ ok: false, message: 'Admin authentication is not configured.' }, { status: 503 });
  }

  const rateLimitKey = getClientRateLimitKey(request);

  if (isLoginRateLimited(rateLimitKey)) {
    return NextResponse.json({ ok: false, message: 'Too many login attempts.' }, { status: 429 });
  }

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
